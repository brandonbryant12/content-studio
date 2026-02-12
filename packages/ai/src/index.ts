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

// ImageGen
export {
  ImageGen,
  type ImageGenService,
  type GenerateImageOptions,
  type GenerateImageResult,
  GoogleImageGenLive,
  type GoogleImageGenConfig,
} from './image-gen';

// DeepResearch
export {
  DeepResearch,
  type DeepResearchService,
  type ResearchResult,
  type ResearchSource,
  GoogleDeepResearchLive,
  type GoogleDeepResearchConfig,
} from './research';

// Chat
export { streamResearchChat, type StreamResearchChatInput } from './chat';

// Import for combined layer
import type { ImageGen } from './image-gen';
import type { LLM } from './llm';
import type { DeepResearch } from './research';
import type { TTS } from './tts';
import { GoogleImageGenLive } from './image-gen';
import { GoogleLive } from './llm';
import { GoogleDeepResearchLive } from './research';
import { GoogleTTSLive } from './tts';

// =============================================================================
// Combined AI Layer
// =============================================================================

/**
 * All AI services bundled together.
 * Use this type in SharedServices instead of listing each service individually.
 */
export type AI = LLM | TTS | ImageGen | DeepResearch;

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
 * Combined layer for all Google AI services (LLM + TTS + ImageGen + DeepResearch).
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
    GoogleDeepResearchLive({ apiKey: config.apiKey }),
  );
