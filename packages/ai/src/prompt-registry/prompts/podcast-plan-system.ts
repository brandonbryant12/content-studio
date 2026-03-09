import type { PodcastFormat } from '@repo/db/schema';
import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

export interface PodcastPlanSystemPromptInput {
  readonly format: PodcastFormat;
  readonly targetDurationMinutes?: number | null;
  readonly hostPersonaName?: string | null;
  readonly coHostPersonaName?: string | null;
}

const buildSectionGuidance = (targetDurationMinutes?: number | null) => {
  if (typeof targetDurationMinutes !== 'number') {
    return 'Choose as many sections as needed for a coherent episode arc. Keep the section count lean and proportionate to the material.';
  }

  if (targetDurationMinutes <= 4) {
    return 'There is no fixed section count. For this short runtime, prefer a very small number of substantial sections so each part has room to breathe. Two or three sections will often be enough, but only if the material supports it.';
  }

  if (targetDurationMinutes <= 10) {
    return 'There is no fixed section count. For this runtime, use only as many sections as needed to create a clean arc without making the episode feel rushed or repetitive.';
  }

  return 'There is no fixed section count. For this longer runtime, you may use more sections when the material genuinely supports them, but avoid splitting the episode into shallow filler segments.';
};

export const podcastPlanSystemPrompt =
  definePrompt<PodcastPlanSystemPromptInput>({
    id: 'podcast.plan.system',
    version: 4,
    owner: PROMPT_OWNER,
    domain: 'podcast',
    role: 'system',
    modelType: 'llm',
    riskTier: 'high',
    status: 'active',
    summary:
      'Defines how to synthesize selected podcast sources into a structured episode plan.',
    compliance: buildCompliance({
      userContent: 'required',
      retention: 'resource-bound',
      notes:
        'Uses user-selected source text and podcast metadata to create a persisted planning artifact.',
    }),
    render: ({
      format,
      targetDurationMinutes,
      hostPersonaName,
      coHostPersonaName,
    }) => {
      const hostLabel = hostPersonaName?.trim() || 'Host';
      const coHostLabel = coHostPersonaName?.trim() || 'Co-Host';
      const durationLine =
        typeof targetDurationMinutes === 'number'
          ? `Target total runtime: about ${targetDurationMinutes} minutes.`
          : 'Target total runtime: keep the plan concise and realistic for a short podcast draft.';

      const formatLine =
        format === 'conversation'
          ? `Plan for a two-person conversation between "${hostLabel}" and "${coHostLabel}".`
          : `Plan for a single-host narrated episode led by "${hostLabel}".`;

      const sectionGuidance = buildSectionGuidance(targetDurationMinutes);

      return `You are an editorial planner for podcast production.

Your job is to turn the provided source material into a concise, listener-friendly episode plan before script writing.

${formatLine}
${durationLine}

Output requirements:
- Stay grounded in the provided sources only.
- Treat the provided sources as the only factual authority for the plan.
- If optional setup directions are provided, use them to shape framing, emphasis, and audience fit without treating them as factual evidence.
- Generate this plan from the current source material in this request, not from any prior plan iteration.
- ${sectionGuidance}
- Each section must contain:
  - a specific heading
  - a short summary
  - 2 to 4 key points
  - sourceIds that reference only the supplied source IDs
  - estimatedMinutes for that section
- Keep the sum of section estimatedMinutes realistic for the target runtime rather than padding or compressing unnaturally.
- If a section draws from the overall source set but not one clear document, use an empty sourceIds array instead of inventing IDs.
- Keep the opening hook sharp and listener-facing.
- Keep the closing takeaway concrete and memorable.
- Do not write the full script. This is a planning artifact only.`;
    },
  });
