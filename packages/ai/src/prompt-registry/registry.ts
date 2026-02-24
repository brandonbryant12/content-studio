import type { AnyPromptDefinition } from './types';
import {
  chatPersonaSystemPrompt,
  chatResearchSystemPrompt,
  chatSynthesizePersonaSystemPrompt,
  chatSynthesizeResearchQuerySystemPrompt,
  chatWritingAssistantSystemPrompt,
  infographicGenerationUserPrompt,
  infographicTitleUserPrompt,
  personaAvatarImageUserPrompt,
  podcastCoverImageUserPrompt,
  podcastScriptSystemPrompt,
  podcastScriptUserPrompt,
  voiceoverPreprocessSystemPrompt,
  voiceoverPreprocessUserPrompt,
} from './prompts';

const PROMPTS: readonly AnyPromptDefinition[] = [
  chatResearchSystemPrompt,
  chatPersonaSystemPrompt,
  chatWritingAssistantSystemPrompt,
  chatSynthesizePersonaSystemPrompt,
  chatSynthesizeResearchQuerySystemPrompt,
  voiceoverPreprocessSystemPrompt,
  voiceoverPreprocessUserPrompt,
  podcastScriptSystemPrompt,
  podcastScriptUserPrompt,
  infographicGenerationUserPrompt,
  infographicTitleUserPrompt,
  podcastCoverImageUserPrompt,
  personaAvatarImageUserPrompt,
] as const;

const seenIds = new Set<string>();

for (const prompt of PROMPTS) {
  if (seenIds.has(prompt.id)) {
    throw new Error(`Duplicate prompt id detected: ${prompt.id}`);
  }
  seenIds.add(prompt.id);
}

const promptById = new Map(
  PROMPTS.map((prompt) => [prompt.id, prompt] as const),
);

export const PROMPT_REGISTRY = PROMPTS;

export const getPromptDefinition = (
  id: string,
): AnyPromptDefinition | undefined => promptById.get(id);
