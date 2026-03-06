import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  convertToModelMessages,
  generateObject,
  jsonSchema,
  streamText,
  type LanguageModelUsage,
  type ToolSet,
} from 'ai';
import { Effect, Layer, JSONSchema, Schedule } from 'effect';
import { LLM_MODEL } from '../../models';
import { PROVIDER_TIMEOUTS_MS } from '../../provider-timeouts';
import {
  AIUsageRecorder,
  createAsyncAIUsageRecorder,
  getAIUsageErrorTag,
  getAIUsageScope,
  recordAIUsageIfConfigured,
} from '../../usage';
import { mapError, shouldRetryLLMError } from '../map-error';
import {
  LLM,
  type LLMService,
  type GenerateOptions,
  type GenerateResult,
  type StreamTextOptions,
} from '../service';

/**
 * Configuration for Google AI provider via AI SDK.
 */
export interface GoogleConfig {
  /** API key - required, should be passed from validated env.GEMINI_API_KEY */
  readonly apiKey: string;
  /** Override the default LLM model from models.ts */
  readonly model?: string;
}

/**
 * Strip markdown code fences that Gemini thinking models sometimes wrap around JSON.
 * e.g. ```json\n{...}\n``` → {...}
 */
function stripMarkdownCodeFence(text: string): string | null {
  const match = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```\s*$/);
  return match ? match[1]!.trim() : null;
}

const toLLMUsageMetrics = (
  usage: LanguageModelUsage | undefined,
): Record<string, number> | undefined => {
  if (!usage) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries({
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      reasoningTokens:
        usage.outputTokenDetails?.reasoningTokens ?? usage.reasoningTokens,
      cachedInputTokens:
        usage.inputTokenDetails?.cacheReadTokens ?? usage.cachedInputTokens,
      noCacheInputTokens: usage.inputTokenDetails?.noCacheTokens,
      cacheWriteInputTokens: usage.inputTokenDetails?.cacheWriteTokens,
      textOutputTokens: usage.outputTokenDetails?.textTokens,
    }).filter(([, value]) => value !== undefined),
  ) as Record<string, number>;
};

const toGenerateResultUsage = (
  usage: LanguageModelUsage | undefined,
): GenerateResult<unknown>['usage'] => {
  if (
    usage?.inputTokens === undefined ||
    usage.outputTokens === undefined ||
    usage.totalTokens === undefined
  ) {
    return undefined;
  }

  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  };
};

const getRawUsage = (usage: unknown): Record<string, unknown> | null => {
  if (typeof usage !== 'object' || usage === null || !('raw' in usage)) {
    return null;
  }

  const raw = (usage as { raw?: unknown }).raw;
  return typeof raw === 'object' && raw !== null
    ? (raw as Record<string, unknown>)
    : null;
};

const buildGenerateMetadata = <T>(options: GenerateOptions<T>) =>
  Object.fromEntries(
    Object.entries({
      promptChars: options.prompt.length,
      systemChars: options.system?.length,
      maxTokens: options.maxTokens,
      temperature: options.temperature ?? 0.7,
    }).filter(([, value]) => value !== undefined),
  ) as Record<string, number>;

const buildStreamMetadata = <TOOLS extends ToolSet>(
  options: StreamTextOptions<TOOLS>,
) =>
  Object.fromEntries(
    Object.entries({
      messageCount: options.messages.length,
      systemChars: options.system?.length,
      maxTokens: options.maxTokens,
      temperature: options.temperature ?? 0.7,
      toolCount: options.tools ? Object.keys(options.tools).length : 0,
    }).filter(([, value]) => value !== undefined),
  ) as Record<string, number>;

/**
 * Create Google AI service implementation via AI SDK.
 */
const makeGoogleService = (config: GoogleConfig): LLMService => {
  const modelId = config.model ?? LLM_MODEL;

  const google = createGoogleGenerativeAI({
    apiKey: config.apiKey,
  });
  const model = google(modelId);

  return {
    generate: <T>(options: GenerateOptions<T>) => {
      const metadata = buildGenerateMetadata(options);
      const attempt = Effect.tryPromise({
        try: async () => {
          const effectJsonSchema = JSONSchema.make(options.schema);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const aiSchema = jsonSchema<T>(effectJsonSchema as any);

          const result = await generateObject({
            model,
            system: options.system,
            prompt: options.prompt,
            schema: aiSchema,
            maxOutputTokens: options.maxTokens,
            temperature: options.temperature ?? 0.7,
            maxRetries: 0,
            abortSignal: AbortSignal.timeout(PROVIDER_TIMEOUTS_MS.llmGenerate),
            experimental_repairText: async ({ text }) =>
              stripMarkdownCodeFence(text),
          });

          return {
            object: result.object as T,
            usage: result.usage,
          };
        },
        catch: mapError,
      }).pipe(
        Effect.tap((result) =>
          recordAIUsageIfConfigured({
            modality: 'llm',
            provider: 'google',
            providerOperation: 'generateObject',
            model: modelId,
            status: 'succeeded',
            usage: toLLMUsageMetrics(result.usage),
            metadata,
            rawUsage: getRawUsage(result.usage),
          }),
        ),
        Effect.tapError((error) =>
          recordAIUsageIfConfigured({
            modality: 'llm',
            provider: 'google',
            providerOperation: 'generateObject',
            model: modelId,
            status: 'failed',
            errorTag: error._tag,
            metadata,
          }),
        ),
        Effect.map(
          (result) =>
            ({
              object: result.object,
              usage: toGenerateResultUsage(result.usage),
            }) satisfies GenerateResult<T>,
        ),
      );

      return attempt.pipe(
        Effect.retry({
          times: 2,
          schedule: Schedule.exponential('500 millis'),
          while: (error) =>
            error._tag === 'LLMError' && shouldRetryLLMError(error),
        }),
        Effect.withSpan('llm.generate', {
          attributes: { 'llm.provider': 'google', 'llm.model': modelId },
        }),
      );
    },

    streamText: <TOOLS extends ToolSet = ToolSet>(
      options: StreamTextOptions<TOOLS>,
    ) =>
      Effect.gen(function* () {
        const metadata = buildStreamMetadata(options);
        const scope = yield* getAIUsageScope;
        const recorderOption = yield* Effect.serviceOption(AIUsageRecorder);
        const recordAsync = createAsyncAIUsageRecorder(recorderOption, scope);
        const modelMessages = yield* Effect.promise(() =>
          convertToModelMessages(
            options.messages,
            options.tools ? { tools: options.tools } : undefined,
          ),
        );

        let finalized = false;
        const finalize = (input: {
          readonly status: 'succeeded' | 'failed' | 'aborted';
          readonly usage?: LanguageModelUsage;
          readonly rawUsage?: Record<string, unknown> | null;
          readonly errorTag?: string | null;
        }) => {
          if (finalized) {
            return;
          }

          finalized = true;
          recordAsync({
            modality: 'llm',
            provider: 'google',
            providerOperation: 'streamText',
            model: modelId,
            status: input.status,
            errorTag: input.errorTag,
            usage: toLLMUsageMetrics(input.usage),
            metadata,
            rawUsage: input.rawUsage,
          });
        };

        const result = yield* Effect.try({
          try: () =>
            streamText({
              model,
              system: options.system,
              messages: modelMessages,
              tools: options.tools,
              maxOutputTokens: options.maxTokens,
              temperature: options.temperature ?? 0.7,
              maxRetries: 0,
              abortSignal: AbortSignal.timeout(
                PROVIDER_TIMEOUTS_MS.llmGenerate,
              ),
              onError: ({ error }) =>
                finalize({
                  status: 'failed',
                  errorTag: getAIUsageErrorTag(error),
                }),
              onAbort: () =>
                finalize({
                  status: 'aborted',
                }),
              onFinish: ({ totalUsage }) =>
                finalize({
                  status: 'succeeded',
                  usage: totalUsage,
                  rawUsage: getRawUsage(totalUsage),
                }),
            }),
          catch: mapError,
        });

        return result.toUIMessageStream();
      }).pipe(
        Effect.tapError((error) =>
          recordAIUsageIfConfigured({
            modality: 'llm',
            provider: 'google',
            providerOperation: 'streamText',
            model: modelId,
            status: 'failed',
            errorTag: error._tag,
            metadata: buildStreamMetadata(options),
          }),
        ),
        Effect.withSpan('llm.streamText', {
          attributes: { 'llm.provider': 'google', 'llm.model': modelId },
        }),
      ),
  };
};

/**
 * Create Google AI LLM service layer via AI SDK v5.
 *
 * @example
 * ```typescript
 * const LLMLive = GoogleLive({ apiKey: env.GEMINI_API_KEY });
 *
 * const program = Effect.gen(function* () {
 *   const llm = yield* LLM;
 *   const result = yield* llm.generate({
 *     prompt: 'Generate a greeting',
 *     schema: GreetingSchema,
 *   });
 *   return result.object;
 * }).pipe(Effect.provide(LLMLive));
 * ```
 */
export const GoogleLive = (config: GoogleConfig): Layer.Layer<LLM> =>
  Layer.sync(LLM, () => makeGoogleService(config));
