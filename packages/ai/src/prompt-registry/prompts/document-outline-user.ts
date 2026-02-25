import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

export interface DocumentOutlineUserPromptInput {
  readonly query: string;
  readonly content: string;
  readonly sourceHints: readonly string[];
}

export const documentOutlineUserPrompt =
  definePrompt<DocumentOutlineUserPromptInput>({
    id: 'document.outline.user',
    version: 1,
    owner: PROMPT_OWNER,
    domain: 'document',
    role: 'user',
    modelType: 'llm',
    riskTier: 'high',
    status: 'active',
    summary:
      'Builds a schema-constrained document outline from research results for UI rendering.',
    compliance: buildCompliance({
      userContent: 'required',
      retention: 'resource-bound',
      notes:
        'Processes query + generated research content into persisted structured outline sections.',
    }),
    render: (input) => `Create a concise, factual outline for the research document.

Research query:
${input.query}

Known source URLs:
${input.sourceHints.join('\n') || '(none)'}

Research content:
${input.content}

Guidance:
- Keep sections focused and non-overlapping.
- Write short summaries that can be shown directly in a UI panel.
- For citations, prefer exact URLs from source hints when possible.
`,
  });
