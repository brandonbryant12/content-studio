import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

export interface PodcastPlanSourceInput {
  readonly id: string;
  readonly title: string;
  readonly content: string;
}

export interface PodcastPlanUserPromptInput {
  readonly title?: string | null;
  readonly description?: string | null;
  readonly setupInstructions?: string | null;
  readonly sourceEntries: readonly PodcastPlanSourceInput[];
}

export const podcastPlanUserPrompt = definePrompt<PodcastPlanUserPromptInput>({
  id: 'podcast.plan.user',
  version: 2,
  owner: PROMPT_OWNER,
  domain: 'podcast',
  role: 'user',
  modelType: 'llm',
  riskTier: 'high',
  status: 'active',
  summary:
    'Supplies podcast metadata and selected source text for episode-plan generation.',
  compliance: buildCompliance({
    userContent: 'required',
    retention: 'resource-bound',
    notes:
      'Includes persisted source text selected by the user and optional podcast metadata.',
  }),
  render: ({ title, description, setupInstructions, sourceEntries }) => {
    const sourceBlock =
      sourceEntries.length > 0
        ? sourceEntries
            .map(
              (source, index) => `## Source ${index + 1}
ID: ${source.id}
Title: ${source.title}
Content:
${source.content}`,
            )
            .join('\n\n')
        : '(no sources supplied)';

    return `Create an episode plan for this podcast setup.

Podcast title:
${title?.trim() || 'Untitled podcast'}

Podcast description:
${description?.trim() || '(none)'}

Setup directions:
${setupInstructions?.trim() || '(none)'}

Selected sources:
${sourceBlock}`;
  },
});
