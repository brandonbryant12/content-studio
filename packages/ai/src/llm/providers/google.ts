import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LLMError, LLMRateLimitError } from '@repo/effect/errors';
import { generateObject, jsonSchema } from 'ai';
import { Effect, Layer, JSONSchema } from 'effect';
import {
  LLM,
  type LLMService,
  type GenerateOptions,
  type GenerateResult,
} from '../service';

/**
 * Configuration for Google AI provider via AI SDK.
 */
export interface GoogleConfig {
  /** API key - required, should be passed from validated env.GEMINI_API_KEY */
  readonly apiKey: string;
  /** Default: 'gemini-2.5-flash' */
  readonly model?: string;
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
 * Create Google AI service implementation via AI SDK.
 */
const makeGoogleService = (config: GoogleConfig): LLMService => {
  const modelId = config.model ?? 'gemini-2.5-flash';

  // Create provider with API key
  const google = createGoogleGenerativeAI({
    apiKey: config.apiKey,
  });

  // Create model instance
  const model = google(modelId);

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
 * const LLMLive = GoogleLive({ model: 'gemini-2.5-flash' });
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
  Layer.succeed(LLM, makeGoogleService(config));
