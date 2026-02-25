import type { InfographicFormat, StyleProperty } from '@repo/db/schema';
import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

const sanitizeStyle = (style: readonly StyleProperty[]): StyleProperty[] =>
  style
    .map((entry) => ({
      key: entry.key.trim(),
      value: entry.value.trim(),
      type: entry.type,
    }))
    .filter((entry) => entry.key.length > 0 && entry.value.length > 0);

const formatStyles = (style: readonly StyleProperty[]): string => {
  if (style.length === 0) return 'No style directives provided.';
  return style
    .map((entry) =>
      entry.type ? `- ${entry.key} (${entry.type}): ${entry.value}` : `- ${entry.key}: ${entry.value}`,
    )
    .join('\n');
};

export interface InfographicLayoutUserPromptInput {
  readonly prompt: string;
  readonly format: InfographicFormat;
  readonly styleProperties: readonly StyleProperty[];
}

export const infographicLayoutUserPrompt =
  definePrompt<InfographicLayoutUserPromptInput>({
    id: 'infographic.layout.user',
    version: 1,
    owner: PROMPT_OWNER,
    domain: 'infographic',
    role: 'user',
    modelType: 'llm',
    riskTier: 'high',
    status: 'active',
    summary:
      'Derives a schema-constrained infographic layout contract before image generation.',
    compliance: buildCompliance({
      userContent: 'required',
      retention: 'resource-bound',
      notes:
        'Uses user-authored infographic prompt and style directives to generate structured layout fields.',
    }),
    render: (input) => {
      const cleanStyles = sanitizeStyle(input.styleProperties);

      return `Create a structured infographic layout from the user brief.

Format: ${input.format}
User brief:
${input.prompt}

Style directives:
${formatStyles(cleanStyles)}

Return concrete section content with concise copy. If chart data is useful, include labeled numeric points.`;
    },
  });
