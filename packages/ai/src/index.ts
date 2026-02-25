import { Layer } from 'effect';

// Model constants
export {
  LLM_MODEL,
  TTS_MODEL,
  IMAGE_GEN_MODEL,
  DEEP_RESEARCH_MODEL,
} from './models';

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

// Prompt registry
export {
  renderPrompt,
  PROMPT_REGISTRY,
  getPromptDefinition,
  chatResearchSystemPrompt,
  chatPersonaSystemPrompt,
  chatWritingAssistantSystemPrompt,
  chatSynthesizePersonaSystemPrompt,
  chatSynthesizeResearchQuerySystemPrompt,
  voiceoverPreprocessSystemPrompt,
  voiceoverPreprocessUserPrompt,
  podcastScriptSystemPrompt,
  podcastScriptUserPrompt,
  infographicGenerationUserPrompt,
  infographicLayoutUserPrompt,
  infographicTitleUserPrompt,
  documentOutlineUserPrompt,
  INFOGRAPHIC_FORMAT_DIMENSIONS,
  podcastCoverImageUserPrompt,
  personaAvatarImageUserPrompt,
  type PromptModelType,
  type PromptRole,
  type PromptRiskTier,
  type PromptLifecycleStatus,
  type PromptComplianceMetadata,
  type PromptDefinition,
  type AnyPromptDefinition,
  type VoiceoverPreprocessUserPromptInput,
  type PersonaPromptContext,
  type SegmentPromptContext,
  type PodcastScriptSystemPromptInput,
  type PodcastScriptUserPromptInput,
  type InfographicGenerationPromptInput,
  type InfographicLayoutUserPromptInput,
  type InfographicTitleUserPromptInput,
  type DocumentOutlineUserPromptInput,
  type PodcastCoverImageUserPromptInput,
  type PersonaAvatarImageUserPromptInput,
} from './prompt-registry';

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
 * Defaults are defined in `models.ts`.
 */
export interface GoogleAIConfig {
  /** Gemini API key - required, should be passed from validated env.GEMINI_API_KEY */
  readonly apiKey: string;
  /** Override the default LLM model */
  readonly llmModel?: string;
  /** Override the default TTS model */
  readonly ttsModel?: string;
  /** Override the default image generation model */
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
