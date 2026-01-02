import { Layer } from 'effect';

// Re-export AI errors from centralized error catalog
export {
  LLMError,
  LLMRateLimitError,
  TTSError,
  TTSQuotaExceededError,
} from '@repo/db/errors';

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
  // Use Cases - Error types are inferred by Effect
  VoiceNotFoundError,
  listVoices,
  previewVoice,
  type ListVoicesInput,
  type ListVoicesResult,
  type PreviewVoiceInput,
  type PreviewVoiceUseCaseResult,
} from './tts';

// Import for combined layer
import { LLM, GoogleLive } from './llm';
import { TTS, GoogleTTSLive } from './tts';

// =============================================================================
// Combined AI Layer
// =============================================================================

/**
 * All AI services bundled together.
 * Use this type in SharedServices instead of listing each service individually.
 */
export type AI = LLM | TTS;

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
  );
