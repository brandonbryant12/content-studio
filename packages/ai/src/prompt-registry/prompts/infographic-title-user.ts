import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

export interface InfographicTitleUserPromptInput {
  readonly sourcePrompt: string;
}

export const infographicTitleUserPrompt =
  definePrompt<InfographicTitleUserPromptInput>({
    id: 'infographic.title.user',
    version: 1,
    owner: PROMPT_OWNER,
    domain: 'infographic',
    role: 'user',
    modelType: 'llm',
    riskTier: 'medium',
    status: 'active',
    summary:
      'Generates concise infographic titles from an original query prompt.',
    compliance: buildCompliance({
      userContent: 'required',
      retention: 'resource-bound',
      notes:
        'Short-form title generation from previously provided user prompt text.',
    }),
    render: (input) =>
      `Generate a short infographic title (3-6 words) from this source query: "${input.sourcePrompt}"`,
  });
