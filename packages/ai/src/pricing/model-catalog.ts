export interface BillableTokenUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
}

interface TokenRates {
  readonly inputUsdPerMillionTokens: number;
  readonly outputUsdPerMillionTokens: number;
}

interface FlatTokenPricing extends TokenRates {
  readonly kind: 'flat';
}

interface TieredTokenPricing {
  readonly kind: 'tiered_by_input_tokens';
  readonly inputTokenThreshold: number;
  readonly lowerOrEqual: TokenRates;
  readonly above: TokenRates;
}

type TokenPricingStrategy = FlatTokenPricing | TieredTokenPricing;

export interface TokenPricedModelDefinition<
  ProviderId extends string,
  ModelId extends string,
> {
  readonly provider: ProviderId;
  readonly id: ModelId;
  readonly pricing: {
    readonly sourceUrl: string;
    readonly asOf: string;
    readonly requiredUsageFields: readonly ['inputTokens', 'outputTokens'];
    readonly strategy: TokenPricingStrategy;
    readonly notes?: string;
  };
}

export const defineTokenPricedModel = <
  const ProviderId extends string,
  const ModelId extends string,
>(
  definition: TokenPricedModelDefinition<ProviderId, ModelId>,
): TokenPricedModelDefinition<ProviderId, ModelId> => definition;

export const estimateTokenPricedModelCostUsdMicros = (
  model: TokenPricedModelDefinition<string, string>,
  usage: BillableTokenUsage,
): number | null => {
  if (usage.inputTokens === undefined || usage.outputTokens === undefined) {
    return null;
  }

  const rates =
    model.pricing.strategy.kind === 'flat'
      ? model.pricing.strategy
      : usage.inputTokens <= model.pricing.strategy.inputTokenThreshold
        ? model.pricing.strategy.lowerOrEqual
        : model.pricing.strategy.above;

  return Math.round(
    usage.inputTokens * rates.inputUsdPerMillionTokens +
      usage.outputTokens * rates.outputUsdPerMillionTokens,
  );
};
