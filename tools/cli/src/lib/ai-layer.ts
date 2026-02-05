import { Effect, Layer } from 'effect';
import { GoogleAILive, type AI } from '@repo/ai';
import { loadEnv, type EnvError } from './env';

export interface AILayerOptions {
  readonly model?: string;
}

export const createAILayer = (
  options?: AILayerOptions,
): Effect.Effect<Layer.Layer<AI>, EnvError> =>
  Effect.gen(function* () {
    const env = yield* loadEnv();
    return GoogleAILive({
      apiKey: env.GEMINI_API_KEY,
      llmModel: options?.model,
    });
  });
