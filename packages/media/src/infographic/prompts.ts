import {
  infographicGenerationUserPrompt,
  INFOGRAPHIC_FORMAT_DIMENSIONS,
  renderPrompt,
  type InfographicGenerationPromptInput,
} from '@repo/ai/prompt-registry';

export type BuildPromptOptions = InfographicGenerationPromptInput;

export const FORMAT_DIMENSIONS = INFOGRAPHIC_FORMAT_DIMENSIONS;

export function buildInfographicPrompt(options: BuildPromptOptions): string {
  return renderPrompt(infographicGenerationUserPrompt, options);
}
