import type { PodcastFormat, Persona, AudienceSegment } from '@repo/db/schema';

export interface PromptPersona {
  name: string;
  personalityDescription: string | null;
  speakingStyle: string | null;
}

export interface PromptAudience {
  name: string;
  description: string | null;
  messagingTone: string | null;
  keyInterests: string | null;
}

/**
 * Build the system prompt for script generation based on podcast format.
 */
export const buildSystemPrompt = (
  format: PodcastFormat,
  customInstructions?: string,
  hostPersona?: PromptPersona | null,
  coHostPersona?: PromptPersona | null,
): string => {
  const basePrompt =
    format === 'conversation'
      ? `You are a podcast script writer creating engaging dialogue between two hosts.
Use "host" and "cohost" as speaker names.
Create natural back-and-forth conversation that explains the content clearly.
Include moments of curiosity, clarification, and enthusiasm.
Make the dialogue feel authentic - hosts can agree, disagree, ask follow-up questions, and share insights.`
      : `You are a podcast script writer creating an engaging monologue.
Use "host" as the single speaker name.
Create clear, engaging narration that explains the content thoroughly.
Use rhetorical questions and varied pacing to maintain listener interest.
Break complex topics into digestible segments with natural transitions.`;

  let personaPart = '';
  if (hostPersona) {
    personaPart += `\n\nHost persona - "${hostPersona.name}":`;
    if (hostPersona.personalityDescription) {
      personaPart += `\nPersonality: ${hostPersona.personalityDescription}`;
    }
    if (hostPersona.speakingStyle) {
      personaPart += `\nSpeaking style: ${hostPersona.speakingStyle}`;
    }
  }
  if (coHostPersona && format === 'conversation') {
    personaPart += `\n\nCo-host persona - "${coHostPersona.name}":`;
    if (coHostPersona.personalityDescription) {
      personaPart += `\nPersonality: ${coHostPersona.personalityDescription}`;
    }
    if (coHostPersona.speakingStyle) {
      personaPart += `\nSpeaking style: ${coHostPersona.speakingStyle}`;
    }
  }

  const customPart = customInstructions
    ? `\n\nAdditional instructions from the user:\n${customInstructions}`
    : '';

  return basePrompt + personaPart + customPart;
};

/**
 * Build the user prompt with document content for script generation.
 */
export const buildUserPrompt = (
  podcast: { title?: string | null; description?: string | null },
  documentContent: string,
  audience?: PromptAudience | null,
): string => {
  const existingContext = podcast.title
    ? `Working title: "${podcast.title}"${podcast.description ? `\nWorking description: ${podcast.description}` : ''}\n\n`
    : '';

  let audiencePart = '';
  if (audience) {
    audiencePart = `\nTarget audience: ${audience.name}`;
    if (audience.description) {
      audiencePart += `\nAudience description: ${audience.description}`;
    }
    if (audience.keyInterests) {
      audiencePart += `\nKey interests: ${audience.keyInterests}`;
    }
    if (audience.messagingTone) {
      audiencePart += `\nPreferred messaging tone: ${audience.messagingTone}`;
    }
    audiencePart += '\n';
  }

  return `Create a podcast episode based on the following source material.

${existingContext}${audiencePart}Source content:
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
