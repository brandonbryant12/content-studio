import type { AnyPromptDefinition } from './types';
import { chatPersonaSystemPrompt } from './prompts/chat-persona-system';
import { chatResearchSystemPrompt } from './prompts/chat-research-system';
import { chatSynthesizePersonaSystemPrompt } from './prompts/chat-synthesize-persona-system';
import { chatSynthesizeResearchQuerySystemPrompt } from './prompts/chat-synthesize-research-query-system';
import { chatWritingAssistantSystemPrompt } from './prompts/chat-writing-assistant-system';
import { infographicGenerationUserPrompt } from './prompts/infographic-generation-user';
import { infographicTitleUserPrompt } from './prompts/infographic-title-user';
import { personaAvatarImageUserPrompt } from './prompts/persona-avatar-image-user';
import { podcastCoverImageUserPrompt } from './prompts/podcast-cover-image-user';
import { podcastPlanSystemPrompt } from './prompts/podcast-plan-system';
import { podcastPlanUserPrompt } from './prompts/podcast-plan-user';
import { podcastScriptSystemPrompt } from './prompts/podcast-script-system';
import { podcastScriptUserPrompt } from './prompts/podcast-script-user';
import { sourceOutlineUserPrompt } from './prompts/source-outline-user';
import { voiceoverPreprocessSystemPrompt } from './prompts/voiceover-preprocess-system';
import { voiceoverPreprocessUserPrompt } from './prompts/voiceover-preprocess-user';

const PROMPTS: readonly AnyPromptDefinition[] = [
  chatResearchSystemPrompt,
  chatPersonaSystemPrompt,
  chatWritingAssistantSystemPrompt,
  chatSynthesizePersonaSystemPrompt,
  chatSynthesizeResearchQuerySystemPrompt,
  voiceoverPreprocessSystemPrompt,
  voiceoverPreprocessUserPrompt,
  podcastPlanSystemPrompt,
  podcastPlanUserPrompt,
  podcastScriptSystemPrompt,
  podcastScriptUserPrompt,
  infographicGenerationUserPrompt,
  infographicTitleUserPrompt,
  sourceOutlineUserPrompt,
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
