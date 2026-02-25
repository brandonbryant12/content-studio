import {
  infographicGenerationUserPrompt,
  INFOGRAPHIC_FORMAT_DIMENSIONS,
  renderPrompt,
  type InfographicGenerationPromptInput,
} from '@repo/ai/prompt-registry';
import type { InfographicLayout } from '@repo/db/schema';

export interface BuildPromptOptions extends InfographicGenerationPromptInput {
  readonly layout?: InfographicLayout | null;
}

export const FORMAT_DIMENSIONS = INFOGRAPHIC_FORMAT_DIMENSIONS;

export function buildInfographicPrompt(options: BuildPromptOptions): string {
  const basePrompt = renderPrompt(infographicGenerationUserPrompt, options);
  if (!options.layout) {
    return basePrompt;
  }

  const sectionDetails = options.layout.sections
    .map((section, index) => {
      const chartPoints =
        section.chartData && section.chartData.length > 0
          ? `\nChart data: ${section.chartData.map((point) => `${point.label}: ${point.value}`).join(', ')}`
          : '';
      return `${index + 1}. ${section.heading}\n${section.body}${chartPoints}`;
    })
    .join('\n\n');

  return `${basePrompt}

Structured layout contract:
Title: ${options.layout.title}
Sections:
${sectionDetails}`;
}
