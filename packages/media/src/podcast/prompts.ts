import type { PodcastFormat } from '@repo/db/schema';

/**
 * Persona information for script generation.
 */
export interface PersonaContext {
  name: string;
  role?: string | null;
  personalityDescription?: string | null;
  speakingStyle?: string | null;
  exampleQuotes?: string[];
}

/**
 * Target audience segment for script generation.
 */
export interface SegmentContext {
  name: string;
  description?: string | null;
  messagingTone?: string | null;
}

/**
 * Full context for building the system prompt.
 */
export interface ScriptPromptContext {
  format: PodcastFormat;
  customInstructions?: string;
  hostPersona?: PersonaContext | null;
  coHostPersona?: PersonaContext | null;
  targetSegment?: SegmentContext | null;
}

/**
 * Build persona context section for the system prompt.
 */
function buildPersonaSection(
  persona: PersonaContext,
  role: 'Host' | 'Co-Host',
): string {
  const lines: string[] = [];
  lines.push(`## ${role} Character: "${persona.name}"`);

  if (persona.role) {
    lines.push(`Role: ${persona.role}`);
  }
  if (persona.personalityDescription) {
    lines.push(`Personality: ${persona.personalityDescription}`);
  }
  if (persona.speakingStyle) {
    lines.push(`Speaking Style: ${persona.speakingStyle}`);
  }
  if (persona.exampleQuotes && persona.exampleQuotes.length > 0) {
    lines.push('Example quotes:');
    persona.exampleQuotes.slice(0, 3).forEach((quote) => {
      lines.push(`- "${quote}"`);
    });
  }

  return lines.join('\n');
}

/**
 * Build target audience section for the system prompt.
 */
function buildSegmentSection(segment: SegmentContext): string {
  const lines: string[] = [];
  lines.push(`## Target Audience: "${segment.name}"`);

  if (segment.description) {
    lines.push(`Who they are: ${segment.description}`);
  }
  if (segment.messagingTone) {
    lines.push(`Messaging tone: ${segment.messagingTone}`);
  }
  lines.push('Adjust your language, examples, and depth for this audience.');

  return lines.join('\n');
}

/**
 * Build the system prompt for script generation based on podcast format,
 * persona characters, and target audience.
 */
export const buildSystemPrompt = (
  formatOrContext: PodcastFormat | ScriptPromptContext,
  customInstructions?: string,
): string => {
  // Support both old signature (format, instructions) and new signature (context)
  const context: ScriptPromptContext =
    typeof formatOrContext === 'string'
      ? { format: formatOrContext, customInstructions }
      : formatOrContext;

  const { format, hostPersona, coHostPersona, targetSegment } = context;
  const instructions = context.customInstructions ?? customInstructions;

  // Determine speaker names based on personas
  const hostName = hostPersona?.name ?? 'host';
  const coHostName = coHostPersona?.name ?? 'cohost';

  // Base prompt with persona-aware speaker names
  const basePrompt =
    format === 'conversation'
      ? `You are a podcast script writer creating engaging dialogue between two hosts.
Use "${hostName}" and "${coHostName}" as speaker names.
Create natural back-and-forth conversation that explains the content clearly.
Include moments of curiosity, clarification, and enthusiasm.
Make the dialogue feel authentic - hosts can agree, disagree, ask follow-up questions, and share insights.`
      : `You are a podcast script writer creating an engaging monologue.
Use "${hostName}" as the single speaker name.
Create clear, engaging narration that explains the content thoroughly.
Use rhetorical questions and varied pacing to maintain listener interest.
Break complex topics into digestible segments with natural transitions.`;

  // Build character context sections
  const characterSections: string[] = [];

  if (hostPersona) {
    characterSections.push(buildPersonaSection(hostPersona, 'Host'));
  }

  if (coHostPersona && format === 'conversation') {
    characterSections.push(buildPersonaSection(coHostPersona, 'Co-Host'));
  }

  if (targetSegment) {
    characterSections.push(buildSegmentSection(targetSegment));
  }

  // Combine all sections
  const parts: string[] = [basePrompt];

  if (characterSections.length > 0) {
    parts.push('\n\n# Character & Audience Context\n');
    parts.push(characterSections.join('\n\n'));

    // Add instruction to embody characters
    if (hostPersona || coHostPersona) {
      parts.push(
        '\n\nThe hosts should embody their character personalities throughout the dialogue. ' +
          'Use their speaking styles and occasional phrases that match their example quotes.',
      );
    }
  }

  if (instructions) {
    parts.push(`\n\n# Additional Instructions\n${instructions}`);
  }

  return parts.join('');
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
