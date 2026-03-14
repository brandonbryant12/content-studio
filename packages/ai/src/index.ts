// Model constants
export {
  LLM_MODEL,
  LLM_MODEL_IDS,
  TTS_MODEL,
  IMAGE_GEN_MODEL,
  DEEP_RESEARCH_MODEL,
  type LLMModelId,
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
  type VoiceId,
  type KnownVoiceId,
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

export {
  type BillableTokenUsage,
  defineTokenPricedModel,
  estimateTokenPricedModelCostUsdMicros,
  type TokenPricedModelDefinition,
} from './pricing/model-catalog';

export { GoogleAILive, type AI, type GoogleAIConfig } from './google-ai';

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
  podcastPlanSystemPrompt,
  podcastPlanUserPrompt,
  podcastScriptSystemPrompt,
  podcastScriptUserPrompt,
  infographicGenerationUserPrompt,
  infographicTitleUserPrompt,
  sourceOutlineUserPrompt,
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
  type ChatWritingAssistantSystemPromptInput,
  type VoiceoverPreprocessUserPromptInput,
  type PodcastPlanSystemPromptInput,
  type PodcastPlanSourceInput,
  type PodcastPlanUserPromptInput,
  type PersonaPromptContext,
  type SegmentPromptContext,
  type EpisodePlanPromptContext,
  type PodcastScriptSystemPromptInput,
  type PodcastScriptUserPromptInput,
  type InfographicGenerationPromptInput,
  type InfographicTitleUserPromptInput,
  type SourceOutlineUserPromptInput,
  type PodcastCoverImageUserPromptInput,
  type PersonaAvatarImageUserPromptInput,
} from './prompt-registry';

// Usage tracking
export {
  AIUsageRecorder,
  DatabaseAIUsageRecorderLive,
  NoopAIUsageRecorderLive,
  annotateAIUsageScope,
  getAIUsageScope,
  inferAIUsageResourceType,
  mergeAIUsageScope,
  withAIUsageScope,
  createAsyncAIUsageRecorder,
  getAIUsageErrorTag,
  recordAIUsageIfConfigured,
  type AIUsageRecorderService,
  type AIUsageRecordInput,
  type AIUsageScope,
  type PersistAIUsageInput,
} from './usage';
