export type PromptModelType = 'llm' | 'image-gen';
export type PromptRole = 'system' | 'user';
export type PromptRiskTier = 'low' | 'medium' | 'high';
export type PromptLifecycleStatus = 'active' | 'deprecated';

export interface PromptComplianceMetadata {
  /**
   * Whether this prompt has completed legal/compliance review.
   */
  readonly reviewStatus: 'pending' | 'approved';
  /**
   * Declares if user-provided content is expected as part of prompt composition.
   */
  readonly userContent: 'none' | 'optional' | 'required';
  /**
   * Inputs that must not be intentionally provided as prompt content.
   */
  readonly prohibitedData: readonly string[];
  /**
   * How long generated prompt text should be retained.
   */
  readonly retention: 'transient' | 'resource-bound';
  /**
   * Short risk and handling note for reviewers.
   */
  readonly notes: string;
}

export interface PromptDefinition<TInput = void> {
  readonly id: string;
  readonly version: number;
  readonly owner: string;
  readonly domain: string;
  readonly role: PromptRole;
  readonly modelType: PromptModelType;
  readonly riskTier: PromptRiskTier;
  readonly status: PromptLifecycleStatus;
  readonly summary: string;
  readonly compliance: PromptComplianceMetadata;
  readonly render: (input: TInput) => string;
}

export type AnyPromptDefinition = PromptDefinition<never>;

export const definePrompt = <TInput>(
  definition: PromptDefinition<TInput>,
): PromptDefinition<TInput> => Object.freeze(definition);
