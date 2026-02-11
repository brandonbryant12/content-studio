import { createVertex } from '@ai-sdk/google-vertex';
import { generateObject, jsonSchema } from 'ai';
import { Effect, Layer, JSONSchema } from 'effect';
import { mapError } from '../map-error';
import {
  LLM,
  type LLMService,
  type GenerateOptions,
  type GenerateResult,
} from '../service';

/**
 * Configuration for Vertex AI provider via AI SDK.
 *
 * Supports two authentication modes:
 * 1. Express Mode: Uses GOOGLE_VERTEX_API_KEY env var (simpler, good for dev)
 * 2. Service Account: Uses GOOGLE_APPLICATION_CREDENTIALS env var (production)
 */
export type VertexConfig =
  | {
      /** Express mode - uses API key */
      readonly mode: 'express';
      /** Vertex AI API key */
      readonly apiKey: string;
      /** Default: 'gemini-2.5-flash' */
      readonly model?: string;
    }
  | {
      /** Service account mode - uses Application Default Credentials */
      readonly mode: 'serviceAccount';
      /** GCP project ID */
      readonly project: string;
      /** GCP region (e.g., 'us-central1') */
      readonly location: string;
      /** Default: 'gemini-2.5-flash' */
      readonly model?: string;
    };

/**
 * Create Vertex AI service implementation via AI SDK.
 */
const makeVertexService = (config: VertexConfig): LLMService => {
  const modelId = config.model ?? 'gemini-2.5-flash';

  const vertex =
    config.mode === 'express'
      ? createVertex({
          // API key is read from GOOGLE_VERTEX_API_KEY env var by the SDK
        })
      : createVertex({
          project: config.project,
          location: config.location,
          // Credentials read from GOOGLE_APPLICATION_CREDENTIALS env var
        });
  const model = vertex(modelId);

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
          attributes: { 'llm.provider': 'vertex', 'llm.model': modelId },
        }),
      ),
  };
};

/**
 * Create Vertex AI LLM service layer via AI SDK v5.
 *
 * @example Express Mode (uses GOOGLE_VERTEX_API_KEY env var)
 * ```typescript
 * const LLMLive = VertexLive({ mode: 'express', apiKey: env.GOOGLE_VERTEX_API_KEY });
 * ```
 *
 * @example Service Account Mode (uses GOOGLE_APPLICATION_CREDENTIALS env var)
 * ```typescript
 * const LLMLive = VertexLive({
 *   mode: 'serviceAccount',
 *   project: env.GOOGLE_VERTEX_PROJECT,
 *   location: env.GOOGLE_VERTEX_LOCATION,
 * });
 * ```
 */
export const VertexLive = (config: VertexConfig): Layer.Layer<LLM> =>
  Layer.succeed(LLM, makeVertexService(config));
