import { Layer } from 'effect';
import type {
  GoogleImageGenModelId,
  GoogleLLMModelId,
  GoogleTTSModelId,
} from './providers/google/models';
import { GoogleImageGenLive } from './providers/google/image-gen';
import { GoogleLive } from './providers/google/llm';
import { GoogleDeepResearchLive } from './providers/google/research';
import { GoogleTTSLive } from './providers/google/tts';

/**
 * Configuration for all Google AI services.
 * Defaults are defined in `models.ts`.
 */
export interface GoogleAIConfig {
  /** Gemini API key - required, should be passed from validated env.GEMINI_API_KEY */
  readonly apiKey: string;
  /** Override the default LLM model */
  readonly llmModel?: GoogleLLMModelId;
  /** Override the default TTS model */
  readonly ttsModel?: GoogleTTSModelId;
  /** Override the default image generation model */
  readonly imageGenModel?: GoogleImageGenModelId;
}

const createGoogleAILayer = (config: GoogleAIConfig) =>
  Layer.mergeAll(
    GoogleLive({ apiKey: config.apiKey, model: config.llmModel }),
    GoogleTTSLive({ apiKey: config.apiKey, model: config.ttsModel }),
    GoogleImageGenLive({
      apiKey: config.apiKey,
      model: config.imageGenModel,
    }),
    GoogleDeepResearchLive({ apiKey: config.apiKey }),
  );

/**
 * All AI services bundled together.
 * Use this type in shared runtime unions instead of maintaining a manual list.
 */
export type AI = Layer.Layer.Success<ReturnType<typeof createGoogleAILayer>>;

/**
 * Combined layer for all Google AI services (LLM + TTS + ImageGen + DeepResearch).
 *
 * @example
 * ```typescript
 * // In runtime.ts
 * const aiLayer = GoogleAILive({ apiKey: env.GEMINI_API_KEY });
 * ```
 */
export const GoogleAILive = createGoogleAILayer;
