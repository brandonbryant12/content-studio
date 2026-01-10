import { Layer } from 'effect';

// Re-export AI errors from package errors
export {
  LLMError,
  LLMRateLimitError,
  TTSError,
  TTSQuotaExceededError,
  VoiceNotFoundError,
  ImageError,
  ImageQuotaExceededError,
  AudioError,
  AudioProcessingError,
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
  // Use Cases
  listVoices,
  previewVoice,
  type ListVoicesInput,
  type ListVoicesResult,
  type PreviewVoiceInput,
  type PreviewVoiceUseCaseResult,
} from './tts';

// Image
export {
  Image,
  type ImageService,
  type AspectRatio,
  type GenerateImageOptions,
  type GenerateImageResult,
  GoogleImageLive,
  type GoogleImageConfig,
} from './image';

// Import for combined layer
import { LLM, GoogleLive } from './llm';
import { TTS, GoogleTTSLive } from './tts';
import { Image, GoogleImageLive } from './image';

// =============================================================================
// Combined AI Layer
// =============================================================================

/**
 * All AI services bundled together.
 * Use this type in SharedServices instead of listing each service individually.
 */
export type AI = LLM | TTS | Image;

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
  /** Image model. Default: 'imagen-3.0-generate-002' */
  readonly imageModel?: string;
}

/**
 * Combined layer for all Google AI services (LLM + TTS + Image).
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
    GoogleImageLive({ apiKey: config.apiKey, model: config.imageModel }),
  );
