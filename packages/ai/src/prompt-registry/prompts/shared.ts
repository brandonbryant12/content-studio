import type { PromptComplianceMetadata } from '../types';

export const PROMPT_PRODUCT_NAME = 'Content Studio' as const;
export const PROMPT_OWNER = 'team:content-studio-ai';

const DEFAULT_PROHIBITED_DATA = [
  'account passwords or authentication secrets',
  'raw payment card or banking data',
  'government-issued identifiers unless strictly required',
] as const;

interface BuildComplianceOptions {
  readonly userContent: PromptComplianceMetadata['userContent'];
  readonly notes: string;
  readonly reviewStatus?: PromptComplianceMetadata['reviewStatus'];
  readonly retention?: PromptComplianceMetadata['retention'];
}

export const buildCompliance = (
  options: BuildComplianceOptions,
): PromptComplianceMetadata => ({
  reviewStatus: options.reviewStatus ?? 'pending',
  userContent: options.userContent,
  prohibitedData: DEFAULT_PROHIBITED_DATA,
  retention: options.retention ?? 'transient',
  notes: options.notes,
});
