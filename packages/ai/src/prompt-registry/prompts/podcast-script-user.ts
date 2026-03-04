import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

export interface PodcastScriptUserPromptInput {
  readonly title?: string | null;
  readonly description?: string | null;
  readonly sourceContent: string;
}

export const podcastScriptUserPrompt =
  definePrompt<PodcastScriptUserPromptInput>({
    id: 'podcast.script.user',
    version: 1,
    owner: PROMPT_OWNER,
    domain: 'podcast',
    role: 'user',
    modelType: 'llm',
    riskTier: 'high',
    status: 'active',
    summary:
      'Packages source content and generation requirements for podcast scripts.',
    compliance: buildCompliance({
      userContent: 'required',
      retention: 'resource-bound',
      notes:
        'Carries full source text plus optional working title/description context.',
    }),
    render: (input) => {
      const existingContext = input.title
        ? `Working title: "${input.title}"${input.description ? `\nWorking description: ${input.description}` : ''}\n\n`
        : '';

      return `Create a podcast episode based on the following source material.

${existingContext}Source content:
---
${input.sourceContent}
---

Generate:
1. A compelling title for this podcast episode
2. A brief description (1-2 sentences) summarizing what listeners will learn
3. A summary of the key points covered
4. 3-5 relevant tags/keywords for categorization (e.g., "technology", "AI", "tutorial")
5. The full script with speaker segments

Each segment should have a speaker and their line of dialogue.
The script should flow naturally and cover the key points from the source material.`;
    },
  });
