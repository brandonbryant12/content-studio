import { Layer } from 'effect';

// Re-export AI errors from package errors
export {
  LLMError,
  LLMRateLimitError,
  TTSError,
  TTSQuotaExceededError,
  VoiceNotFoundError,
  AudioError,
  AudioProcessingError,
  ImageGenError,
  ImageGenRateLimitError,
  ImageGenContentFilteredError,
  ResearchError,
  ResearchTimeoutError,
  type AIError,
} from './errors';

// LLM
export {
  LLM,
  type LLMService,
  type GenerateOptions,
  type GenerateResult,
  GoogleLive as LLMGoogleLive,
  type GoogleConfig as LLMGoogleConfig,
  VertexLive as LLMVertexLive,
  type VertexConfig as LLMVertexConfig,
} from './llm';

// TTS
export {
  TTS,
  type TTSService,
  type AudioEncoding,
  type SpeakerTurn,
  type SpeakerVoiceConfig,
  type SynthesizeOptions,
  type SynthesizeResult,
  type ListVoicesOptions,
  type PreviewVoiceOptions,
  type PreviewVoiceResult,
  VOICES,
  FEMALE_VOICES,
  MALE_VOICES,
  ALL_VOICE_IDS,
  type GeminiVoiceId,
  type VoiceGender,
  type VoiceInfo,
  isValidVoiceId,
  getVoiceById,
  getVoicesByGender,
  getVoiceGender,
  DEFAULT_PREVIEW_TEXT,
  GoogleTTSLive,
  type GoogleTTSConfig,
  VertexTTSLive,
  type VertexTTSConfig,
  // Use Cases
  listVoices,
  previewVoice,
  type ListVoicesInput,
  type ListVoicesResult,
  type PreviewVoiceInput,
  type PreviewVoiceUseCaseResult,
} from './tts';

// ImageGen
export {
  ImageGen,
  type ImageGenService,
  type GenerateImageOptions,
  type GenerateImageResult,
  GoogleImageGenLive,
  type GoogleImageGenConfig,
} from './image-gen';

// Import for combined layer
import { LLM, GoogleLive, VertexLive } from './llm';
import { TTS, GoogleTTSLive, VertexTTSLive } from './tts';
import { ImageGen, GoogleImageGenLive } from './image-gen';

// =============================================================================
// Combined AI Layer
// =============================================================================

/**
 * All AI services bundled together.
 * Use this type in SharedServices instead of listing each service individually.
 */
export type AI = LLM | TTS | ImageGen;

/**
 * Configuration for all Google AI services.
 */
export interface GoogleAIConfig {
  /** Gemini API key - required, should be passed from validated env.GEMINI_API_KEY */
  readonly apiKey: string;
  /** LLM model. Default: 'gemini-2.5-flash' */
  readonly llmModel?: string;
  /** TTS model. Default: 'gemini-2.5-flash-preview-tts' */
  readonly ttsModel?: string;
  /** ImageGen model. Default: 'gemini-2.0-flash-exp' */
  readonly imageGenModel?: string;
}

/**
 * Combined layer for all Google AI services (LLM + TTS).
 *
 * @example
 * ```typescript
 * // In runtime.ts
 * const aiLayer = GoogleAILive({ apiKey: env.GEMINI_API_KEY });
 * ```
 */
export const GoogleAILive = (config: GoogleAIConfig): Layer.Layer<AI> =>
  Layer.mergeAll(
    GoogleLive({ apiKey: config.apiKey, model: config.llmModel }),
    GoogleTTSLive({ apiKey: config.apiKey, model: config.ttsModel }),
    GoogleImageGenLive({
      apiKey: config.apiKey,
      model: config.imageGenModel,
    }),
  );

// =============================================================================
// Vertex AI Provider
// =============================================================================

/**
 * AI Provider type - which Google AI backend to use.
 */
export type AIProvider = 'gemini' | 'vertex';

/**
 * Configuration for Vertex AI services.
 *
 * Supports two authentication modes:
 * 1. Express Mode: Uses API key (simpler, good for dev)
 * 2. Service Account: Uses Application Default Credentials (production)
 */
export type VertexAIConfig =
  | {
      /** Express mode - uses API key */
      readonly mode: 'express';
      /** Vertex AI API key */
      readonly apiKey: string;
      /** LLM model. Default: 'gemini-2.5-flash' */
      readonly llmModel?: string;
      /** TTS model. Default: 'gemini-2.5-flash-preview-tts' */
      readonly ttsModel?: string;
    }
  | {
      /** Service account mode - uses Application Default Credentials */
      readonly mode: 'serviceAccount';
      /** GCP project ID */
      readonly project: string;
      /** GCP region (e.g., 'us-central1') */
      readonly location: string;
      /** LLM model. Default: 'gemini-2.5-flash' */
      readonly llmModel?: string;
      /** TTS model. Default: 'gemini-2.5-flash-preview-tts' */
      readonly ttsModel?: string;
    };

/**
 * Combined layer for all Vertex AI services (LLM + TTS).
 *
 * @example Express Mode
 * ```typescript
 * const aiLayer = VertexAILive({
 *   mode: 'express',
 *   apiKey: env.GOOGLE_VERTEX_API_KEY,
 * });
 * ```
 *
 * @example Service Account Mode
 * ```typescript
 * const aiLayer = VertexAILive({
 *   mode: 'serviceAccount',
 *   project: env.GOOGLE_VERTEX_PROJECT,
 *   location: env.GOOGLE_VERTEX_LOCATION,
 * });
 * ```
 */
export const VertexAILive = (config: VertexAIConfig): Layer.Layer<AI> => {
  if (config.mode === 'express') {
    return Layer.mergeAll(
      VertexLive({
        mode: 'express',
        apiKey: config.apiKey,
        model: config.llmModel,
      }),
      VertexTTSLive({
        mode: 'express',
        apiKey: config.apiKey,
        model: config.ttsModel,
      }),
      GoogleImageGenLive({ apiKey: config.apiKey }),
    );
  }

  // Service account mode doesn't have a simple API key for image gen.
  // Use GEMINI_API_KEY env var as fallback for image gen in SA mode.
  const imageGenApiKey = process.env.GEMINI_API_KEY ?? '';
  return Layer.mergeAll(
    VertexLive({
      mode: 'serviceAccount',
      project: config.project,
      location: config.location,
      model: config.llmModel,
    }),
    VertexTTSLive({
      mode: 'serviceAccount',
      project: config.project,
      location: config.location,
      model: config.ttsModel,
    }),
    GoogleImageGenLive({ apiKey: imageGenApiKey }),
  );
};
