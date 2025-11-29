import type { PodcastFormat } from '@repo/db/schema';

/**
 * Build the system prompt for script generation based on podcast format.
 */
export const buildSystemPrompt = (
  format: PodcastFormat,
  customInstructions?: string,
): string => {
  const basePrompt =
    format === 'conversation'
      ? `You are a podcast script writer creating engaging dialogue between two hosts.
Use "host" and "co-host" as speaker names.
Create natural back-and-forth conversation that explains the content clearly.
Include moments of curiosity, clarification, and enthusiasm.
Make the dialogue feel authentic - hosts can agree, disagree, ask follow-up questions, and share insights.`
      : `You are a podcast script writer creating an engaging monologue.
Use "host" as the single speaker name.
Create clear, engaging narration that explains the content thoroughly.
Use rhetorical questions and varied pacing to maintain listener interest.
Break complex topics into digestible segments with natural transitions.`;

  const customPart = customInstructions
    ? `\n\nAdditional instructions from the user:\n${customInstructions}`
    : '';

  return basePrompt + customPart;
};

/**
 * Build the user prompt with document content for script generation.
 */
export const buildUserPrompt = (
  podcast: { title?: string | null; description?: string | null },
  documentContent: string,
): string => {
  const existingContext = podcast.title
    ? `Working title: "${podcast.title}"${podcast.description ? `\nWorking description: ${podcast.description}` : ''}\n\n`
    : '';

  return `Create a podcast episode based on the following source material.

${existingContext}Source content:
---
${documentContent}
---

Generate:
1. A compelling title for this podcast episode
2. A brief description (1-2 sentences) summarizing what listeners will learn
3. A summary of the key points covered
4. 3-5 relevant tags/keywords for categorization (e.g., "technology", "AI", "tutorial")
5. The full script with speaker segments

Each segment should have a speaker and their line of dialogue.
The script should flow naturally and cover the key points from the source material.`;
};
