import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

export interface InfographicTitleUserPromptInput {
  readonly sourcePrompt: string;
}

export const infographicTitleUserPrompt =
  definePrompt<InfographicTitleUserPromptInput>({
    id: 'infographic.title.user',
    version: 3,
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
        'Short-form title generation from previously provided user prompt text with explicit formatting constraints suitable for later image text rendering.',
    }),
    render: (input) =>
      [
        'Create exactly one concise infographic title.',
        'Requirements:',
        '- 3 to 6 words.',
        '- Clear, concrete, and specific to the main topic.',
        '- Favor words that will render cleanly and legibly in an image.',
        '- Use title case.',
        '- No quotation marks, emojis, colons, or trailing punctuation.',
        '- Return only the title text.',
        '',
        `Source query: "${input.sourcePrompt.trim()}"`,
      ].join('\n'),
  });
