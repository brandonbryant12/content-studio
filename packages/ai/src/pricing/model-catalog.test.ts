import { describe, expect, it } from 'vitest';
import {
  defineTokenPricedModel,
  estimateTokenPricedModelCostUsdMicros,
} from './model-catalog';

const flatPricedModel = defineTokenPricedModel({
  provider: 'google',
  id: 'flat-model',
  pricing: {
    sourceUrl: 'https://example.com/pricing',
    asOf: '2026-03-14',
    requiredUsageFields: ['inputTokens', 'outputTokens'],
    strategy: {
      kind: 'flat',
      inputUsdPerMillionTokens: 0.2,
      outputUsdPerMillionTokens: 0.8,
    },
  },
});

const tieredPricedModel = defineTokenPricedModel({
  provider: 'google',
  id: 'tiered-model',
  pricing: {
    sourceUrl: 'https://example.com/pricing',
    asOf: '2026-03-14',
    requiredUsageFields: ['inputTokens', 'outputTokens'],
    strategy: {
      kind: 'tiered_by_input_tokens',
      inputTokenThreshold: 1_000,
      lowerOrEqual: {
        inputUsdPerMillionTokens: 0.1,
        outputUsdPerMillionTokens: 0.4,
      },
      above: {
        inputUsdPerMillionTokens: 0.3,
        outputUsdPerMillionTokens: 1.2,
      },
    },
  },
});

describe('estimateTokenPricedModelCostUsdMicros', () => {
  it('returns null when required usage fields are missing', () => {
    expect(
      estimateTokenPricedModelCostUsdMicros(flatPricedModel, {
        inputTokens: 10,
      }),
    ).toBeNull();
  });

  it('estimates cost for flat-rate models', () => {
    expect(
      estimateTokenPricedModelCostUsdMicros(flatPricedModel, {
        inputTokens: 100,
        outputTokens: 50,
      }),
    ).toBe(60);
  });

  it('uses the lower tier when input tokens stay under the threshold', () => {
    expect(
      estimateTokenPricedModelCostUsdMicros(tieredPricedModel, {
        inputTokens: 1_000,
        outputTokens: 500,
      }),
    ).toBe(300);
  });

  it('uses the upper tier when input tokens exceed the threshold', () => {
    expect(
      estimateTokenPricedModelCostUsdMicros(tieredPricedModel, {
        inputTokens: 1_500,
        outputTokens: 500,
      }),
    ).toBe(1_050);
  });
});
