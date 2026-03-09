import {
  podcastPlanSystemPrompt,
  podcastPlanUserPrompt,
  podcastScriptSystemPrompt,
  podcastScriptUserPrompt,
  renderPrompt,
  type PodcastPlanSystemPromptInput,
  type PodcastPlanUserPromptInput,
  type PersonaPromptContext,
  type SegmentPromptContext,
  type EpisodePlanPromptContext,
  type PodcastScriptSystemPromptInput,
} from '@repo/ai/prompt-registry';
import type { PodcastFormat } from '@repo/db/schema';

/**
 * Persona information for script generation.
 */
export type PersonaContext = PersonaPromptContext;

/**
 * Target audience segment for script generation.
 */
export type SegmentContext = SegmentPromptContext;
export type EpisodePlanContext = EpisodePlanPromptContext;

/**
 * Full context for building the system prompt.
 */
export type ScriptPromptContext = PodcastScriptSystemPromptInput;
export type PlanPromptContext = PodcastPlanSystemPromptInput;

/**
 * Build the system prompt for script generation based on podcast format,
 * persona characters, and target audience.
 */
export const buildSystemPrompt = (
  formatOrContext: PodcastFormat | ScriptPromptContext,
  customInstructions?: string,
): string => {
  const context: ScriptPromptContext =
    typeof formatOrContext === 'string'
      ? { format: formatOrContext, customInstructions }
      : formatOrContext;

  return renderPrompt(podcastScriptSystemPrompt, context);
};

/**
 * Build the user prompt with source content for script generation.
 */
export const buildUserPrompt = (
  podcast: { title?: string | null; description?: string | null },
  sourceContent: string,
): string =>
  renderPrompt(podcastScriptUserPrompt, {
    title: podcast.title,
    description: podcast.description,
    sourceContent,
  });

export const buildPlanSystemPrompt = (context: PlanPromptContext): string =>
  renderPrompt(podcastPlanSystemPrompt, context);

export const buildPlanUserPrompt = (
  context: PodcastPlanUserPromptInput,
): string => renderPrompt(podcastPlanUserPrompt, context);
