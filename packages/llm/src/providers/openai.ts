import { createOpenAI } from '@ai-sdk/openai';
import { LLMError, LLMRateLimitError } from '@repo/effect/errors';
import { generateObject, jsonSchema, type LanguageModel } from 'ai';
import { Effect, Layer, JSONSchema } from 'effect';
import { LLM, type LLMService, type GenerateOptions, type GenerateResult } from '../service';

/**
 * Configuration for OpenAI provider via AI SDK.
 */
export interface OpenAIConfig {
  /** Uses OPENAI_API_KEY env var if not provided */
  readonly apiKey?: string;
  /** Default: 'gpt-4o-mini' */
  readonly model?: string;
  /** For proxies/alternative endpoints */
  readonly baseURL?: string;
}

/**
 * Map AI SDK errors to domain errors.
 */
const mapError = (error: unknown): LLMError | LLMRateLimitError => {
  if (error instanceof Error) {
    // Check for rate limit errors
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return new LLMRateLimitError({
        message: error.message,
      });
    }

    return new LLMError({
      message: error.message,
      cause: error,
    });
  }

  return new LLMError({
    message: 'Unknown LLM error',
    cause: error,
  });
};

/**
 * Create OpenAI service implementation via AI SDK.
 */
const makeOpenAIService = (config: OpenAIConfig): LLMService => {
  const modelId = config.model ?? 'gpt-4o-mini';

  // Create provider with custom settings if needed
  const provider = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  // The provider returns LanguageModelV1, which is compatible with generateObject
  const model = provider(modelId) as unknown as LanguageModel;

  return {
    model,

    generate: <T>(options: GenerateOptions<T>) =>
      Effect.tryPromise({
        try: async () => {
          // Convert Effect Schema to JSON Schema, then wrap with AI SDK's jsonSchema helper
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
          });

          const generateResult: GenerateResult<T> = {
            object: result.object as T,
            usage:
              result.usage.inputTokens !== undefined &&
              result.usage.outputTokens !== undefined &&
              result.usage.totalTokens !== undefined
                ? {
                    inputTokens: result.usage.inputTokens,
                    outputTokens: result.usage.outputTokens,
                    totalTokens: result.usage.totalTokens,
                  }
                : undefined,
          };

          return generateResult;
        },
        catch: mapError,
      }).pipe(
        Effect.withSpan('llm.generate', {
          attributes: { 'llm.provider': 'openai', 'llm.model': modelId },
        }),
      ),
  };
};

/**
 * Create OpenAI LLM service layer via AI SDK v5.
 *
 * @example
 * ```typescript
 * const LLMLive = OpenAILive({ model: 'gpt-4o-mini' });
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
export const OpenAILive = (config: OpenAIConfig = {}): Layer.Layer<LLM> =>
  Layer.succeed(LLM, makeOpenAIService(config));
