import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

export interface PodcastCoverImageUserPromptInput {
  readonly title: string;
  readonly description?: string | null;
  readonly summary?: string | null;
}

export const podcastCoverImageUserPrompt =
  definePrompt<PodcastCoverImageUserPromptInput>({
    id: 'podcast.cover-image.user',
    version: 1,
    owner: PROMPT_OWNER,
    domain: 'podcast',
    role: 'user',
    modelType: 'image-gen',
    riskTier: 'medium',
    status: 'active',
    summary: 'Creates podcast cover-image instructions from podcast metadata.',
    compliance: buildCompliance({
      userContent: 'required',
      retention: 'resource-bound',
      notes:
        'Prompt composes podcast title/description/summary for generated cover art.',
    }),
    render: (input) =>
      `Create a podcast cover image for "${input.title}". ${input.description ?? ''}. ${input.summary ?? ''}`.trim(),
  });
