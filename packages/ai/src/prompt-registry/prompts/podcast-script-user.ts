import type { PodcastFormat } from '@repo/db/schema';
import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

export interface PodcastScriptUserPromptInput {
  readonly title?: string | null;
  readonly description?: string | null;
  readonly format?: PodcastFormat | null;
  readonly targetDurationMinutes?: number | null;
  readonly sourceContent: string;
}

const WORDS_PER_MINUTE = {
  voice_over: 165,
  conversation: 175,
} as const;

const roundToNearest25 = (value: number) => Math.round(value / 25) * 25;

const buildWordBudgetLine = (
  format?: PodcastFormat | null,
  targetDurationMinutes?: number | null,
) => {
  if (
    (format !== 'conversation' && format !== 'voice_over') ||
    typeof targetDurationMinutes !== 'number'
  ) {
    return null;
  }

  const wordsPerMinute =
    format === 'conversation'
      ? WORDS_PER_MINUTE.conversation
      : WORDS_PER_MINUTE.voice_over;
  const targetWords = roundToNearest25(wordsPerMinute * targetDurationMinutes);
  const minWords = roundToNearest25(targetWords * 0.9);
  const maxWords = roundToNearest25(targetWords * 1.1);

  return `For this ${format === 'conversation' ? 'conversation' : 'voice-over'} episode, deliver about ${targetWords} spoken words overall after excluding TTS annotations, and keep the script inside the ${minWords}-${maxWords} word range.\n\n`;
};

export const podcastScriptUserPrompt =
  definePrompt<PodcastScriptUserPromptInput>({
    id: 'podcast.script.user',
    version: 3,
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
      const wordBudgetLine = buildWordBudgetLine(
        input.format,
        input.targetDurationMinutes,
      );
      const runtimeContext =
        typeof input.targetDurationMinutes === 'number'
          ? `Target spoken runtime: about ${input.targetDurationMinutes} minutes. Write enough detailed dialogue or narration to fill that runtime, and do not compress the material into a brief recap.\n\n${wordBudgetLine ?? ''}Build a complete episode with an opening, developed middle sections, and a closing takeaway.\n\n`
          : '';

      return `Create a podcast episode based on the following source material.

${existingContext}${runtimeContext}Source content:
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
The script should flow naturally, cover the key points from the source material, and be substantial enough to satisfy the requested runtime.`;
    },
  });
