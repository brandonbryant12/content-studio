import {
  defineTokenPricedModel,
  type TokenPricedModelDefinition,
} from '../../pricing/model-catalog';

const GOOGLE_GEMINI_PRICING_URL =
  'https://ai.google.dev/gemini-api/docs/pricing';
const GOOGLE_DEEP_RESEARCH_PRICING_URL =
  'https://ai.google.dev/gemini-api/docs/deep_research';
const GOOGLE_PRICING_AS_OF = '2026-03-06' as const;

type GoogleModelDefinition<ModelId extends string> = TokenPricedModelDefinition<
  'google',
  ModelId
>;

export const GOOGLE_LLM_MODELS = {
  'gemini-3.1-flash-lite-preview': defineTokenPricedModel({
    provider: 'google',
    id: 'gemini-3.1-flash-lite-preview',
    pricing: {
      sourceUrl: GOOGLE_GEMINI_PRICING_URL,
      asOf: GOOGLE_PRICING_AS_OF,
      requiredUsageFields: ['inputTokens', 'outputTokens'],
      strategy: {
        kind: 'flat',
        inputUsdPerMillionTokens: 0.25,
        outputUsdPerMillionTokens: 1.5,
      },
    },
  }),
} as const;

export const GOOGLE_TTS_MODELS = {
  'gemini-2.5-flash-preview-tts': defineTokenPricedModel({
    provider: 'google',
    id: 'gemini-2.5-flash-preview-tts',
    pricing: {
      sourceUrl: GOOGLE_GEMINI_PRICING_URL,
      asOf: GOOGLE_PRICING_AS_OF,
      requiredUsageFields: ['inputTokens', 'outputTokens'],
      strategy: {
        kind: 'flat',
        inputUsdPerMillionTokens: 0.5,
        outputUsdPerMillionTokens: 10,
      },
    },
  }),
} as const;

export const GOOGLE_IMAGE_GEN_MODELS = {
  'gemini-3.1-flash-image-preview': defineTokenPricedModel({
    provider: 'google',
    id: 'gemini-3.1-flash-image-preview',
    pricing: {
      sourceUrl: GOOGLE_GEMINI_PRICING_URL,
      asOf: GOOGLE_PRICING_AS_OF,
      requiredUsageFields: ['inputTokens', 'outputTokens'],
      strategy: {
        kind: 'flat',
        inputUsdPerMillionTokens: 0.5,
        outputUsdPerMillionTokens: 60,
      },
      notes:
        'Uses image-output token pricing. Text/thinking output is not split out separately by the current provider integration.',
    },
  }),
} as const;

export const GOOGLE_DEEP_RESEARCH_MODELS = {
  'deep-research-pro-preview-12-2025': defineTokenPricedModel({
    provider: 'google',
    id: 'deep-research-pro-preview-12-2025',
    pricing: {
      sourceUrl: GOOGLE_DEEP_RESEARCH_PRICING_URL,
      asOf: GOOGLE_PRICING_AS_OF,
      requiredUsageFields: ['inputTokens', 'outputTokens'],
      strategy: {
        kind: 'tiered_by_input_tokens',
        inputTokenThreshold: 200_000,
        lowerOrEqual: {
          inputUsdPerMillionTokens: 2,
          outputUsdPerMillionTokens: 12,
        },
        above: {
          inputUsdPerMillionTokens: 4,
          outputUsdPerMillionTokens: 18,
        },
      },
      notes:
        'Tool fees and intermediate reasoning usage may add extra charges beyond plain token inference rates.',
    },
  }),
} as const;

export type GoogleLLMModelId = keyof typeof GOOGLE_LLM_MODELS;
export type GoogleTTSModelId = keyof typeof GOOGLE_TTS_MODELS;
export type GoogleImageGenModelId = keyof typeof GOOGLE_IMAGE_GEN_MODELS;
export type GoogleDeepResearchModelId =
  keyof typeof GOOGLE_DEEP_RESEARCH_MODELS;

export const LLM_MODEL: GoogleLLMModelId = 'gemini-3.1-flash-lite-preview';
export const TTS_MODEL: GoogleTTSModelId = 'gemini-2.5-flash-preview-tts';
export const IMAGE_GEN_MODEL: GoogleImageGenModelId =
  'gemini-3.1-flash-image-preview';
export const DEEP_RESEARCH_MODEL: GoogleDeepResearchModelId =
  'deep-research-pro-preview-12-2025';

export const getGoogleLLMModel = (
  modelId: GoogleLLMModelId,
): GoogleModelDefinition<GoogleLLMModelId> => GOOGLE_LLM_MODELS[modelId];

export const getGoogleTTSModel = (
  modelId: GoogleTTSModelId,
): GoogleModelDefinition<GoogleTTSModelId> => GOOGLE_TTS_MODELS[modelId];

export const getGoogleImageGenModel = (
  modelId: GoogleImageGenModelId,
): GoogleModelDefinition<GoogleImageGenModelId> =>
  GOOGLE_IMAGE_GEN_MODELS[modelId];

export const getGoogleDeepResearchModel = (
  modelId: GoogleDeepResearchModelId,
): GoogleModelDefinition<GoogleDeepResearchModelId> =>
  GOOGLE_DEEP_RESEARCH_MODELS[modelId];
