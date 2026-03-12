import type { PodcastFormat } from '@repo/db/schema';
import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

export interface PersonaPromptContext {
  readonly name: string;
  readonly role?: string | null;
  readonly personalityDescription?: string | null;
  readonly speakingStyle?: string | null;
  readonly exampleQuotes?: readonly string[];
}

export interface SegmentPromptContext {
  readonly name: string;
  readonly description?: string | null;
  readonly messagingTone?: string | null;
}

export interface EpisodePlanPromptContextSection {
  readonly heading: string;
  readonly summary: string;
  readonly keyPoints: readonly string[];
  readonly sourceIds?: readonly string[];
  readonly estimatedMinutes?: number;
}

export interface EpisodePlanPromptContext {
  readonly angle: string;
  readonly openingHook: string;
  readonly closingTakeaway: string;
  readonly sections: readonly EpisodePlanPromptContextSection[];
}

export interface PodcastScriptSystemPromptInput {
  readonly format: PodcastFormat;
  readonly targetDurationMinutes?: number | null;
  readonly customInstructions?: string;
  readonly hostPersona?: PersonaPromptContext | null;
  readonly coHostPersona?: PersonaPromptContext | null;
  readonly targetSegment?: SegmentPromptContext | null;
  readonly episodePlan: EpisodePlanPromptContext;
}

const WORDS_PER_MINUTE = {
  voice_over: 165,
  conversation: 175,
} as const;

const roundToNearest25 = (value: number) => Math.round(value / 25) * 25;

interface WordBudget {
  readonly wordsPerMinute: number;
  readonly targetWords: number;
  readonly minWords: number;
  readonly maxWords: number;
}

function getWordBudget(
  format: PodcastFormat,
  targetDurationMinutes?: number | null,
): WordBudget | null {
  if (typeof targetDurationMinutes !== 'number') {
    return null;
  }

  const wordsPerMinute =
    format === 'conversation'
      ? WORDS_PER_MINUTE.conversation
      : WORDS_PER_MINUTE.voice_over;
  const targetWords = roundToNearest25(wordsPerMinute * targetDurationMinutes);

  return {
    wordsPerMinute,
    targetWords,
    minWords: roundToNearest25(targetWords * 0.9),
    maxWords: roundToNearest25(targetWords * 1.1),
  };
}

function buildPersonaSection(
  persona: PersonaPromptContext,
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

function buildSegmentSection(segment: SegmentPromptContext): string {
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

function buildEpisodePlanSection(
  plan: EpisodePlanPromptContext,
  format: PodcastFormat,
): string {
  const lines: string[] = [];

  lines.push(`Angle: ${plan.angle}`);
  lines.push(`Opening hook: ${plan.openingHook}`);

  plan.sections.forEach((section, index) => {
    lines.push(`\n## Section ${index + 1}: ${section.heading}`);
    lines.push(`Summary: ${section.summary}`);

    if (section.keyPoints.length > 0) {
      lines.push('Key points:');
      section.keyPoints.forEach((point) => {
        lines.push(`- ${point}`);
      });
    }

    if (section.sourceIds && section.sourceIds.length > 0) {
      lines.push(`Source focus: ${section.sourceIds.join(', ')}`);
    }

    if (typeof section.estimatedMinutes === 'number') {
      lines.push(`Estimated minutes: ${section.estimatedMinutes}`);
      lines.push(
        `Target words: about ${roundToNearest25(
          (format === 'conversation'
            ? WORDS_PER_MINUTE.conversation
            : WORDS_PER_MINUTE.voice_over) * section.estimatedMinutes,
        )}`,
      );
    }
  });

  lines.push(`\nClosing takeaway: ${plan.closingTakeaway}`);

  return lines.join('\n');
}

function buildWordBudgetGuidance(
  format: PodcastFormat,
  targetDurationMinutes?: number | null,
): string | null {
  const budget = getWordBudget(format, targetDurationMinutes);

  if (!budget) {
    return null;
  }

  const episodeLabel =
    format === 'conversation' ? 'conversation episodes' : 'voice-over episodes';

  return `This TTS setup reads ${episodeLabel} at about ${budget.wordsPerMinute} spoken words per minute. Target about ${budget.targetWords} spoken words overall after excluding TTS annotations, and keep the full script inside the ${budget.minWords}-${budget.maxWords} word range. Before returning the final answer, silently verify the spoken-word total and expand underwritten sections until the draft lands in range.`;
}

export const podcastScriptSystemPrompt =
  definePrompt<PodcastScriptSystemPromptInput>({
    id: 'podcast.script.system',
    version: 7,
    owner: PROMPT_OWNER,
    domain: 'podcast',
    role: 'system',
    modelType: 'llm',
    riskTier: 'high',
    status: 'active',
    summary:
      'Defines podcast script generation policy, runtime targeting, speaker behavior, and TTS annotation rules.',
    compliance: buildCompliance({
      userContent: 'required',
      retention: 'resource-bound',
      notes:
        'Includes persona context, approved episode plans, and optional user instructions that may contain personal data.',
    }),
    render: (context) => {
      const {
        format,
        targetDurationMinutes,
        hostPersona,
        coHostPersona,
        targetSegment,
        episodePlan,
      } = context;
      const instructions = context.customInstructions;
      const wordBudgetGuidance = buildWordBudgetGuidance(
        format,
        targetDurationMinutes,
      );

      const hostName = hostPersona?.name ?? 'host';
      const coHostName = coHostPersona?.name ?? 'cohost';

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

      const parts: string[] = [basePrompt];

      if (typeof targetDurationMinutes === 'number') {
        parts.push(
          `\n\nTarget runtime: about ${targetDurationMinutes} minutes. Pace the script so the full episode lands close to that duration, with section depth and transitions sized to fit.`,
        );
      }

      if (wordBudgetGuidance) {
        parts.push(`\n${wordBudgetGuidance}`);
      }

      parts.push(`\n\n# Output Requirements
- Deliver a full episode draft, not a short recap or outline.
- Use enough segments, line length, and transitions to satisfy the runtime target naturally.
- If the source material is dense research or a long article, unpack it with explanation, examples, and comparisons instead of compressing it into headlines.
- Keep each approved section distinct in the final script rather than collapsing multiple sections into one quick exchange.
- For conversation episodes longer than 3 minutes, most turns should contain developed explanation, reaction, or examples rather than one short sentence passed back and forth.`);

      if (characterSections.length > 0) {
        parts.push('\n\n# Character & Audience Context\n');
        parts.push(characterSections.join('\n\n'));

        if (hostPersona || coHostPersona) {
          parts.push(
            '\n\nThe hosts should embody their character personalities throughout the dialogue. ' +
              'Use their speaking styles and occasional phrases that match their example quotes.',
          );
        }
      }

      parts.push('\n\n# Approved Episode Plan\n');
      parts.push(buildEpisodePlanSection(episodePlan, format));
      parts.push(
        '\n\nTreat this plan as the required episode structure, but not as a source of factual authority. Source materials remain the ground truth. If the plan or extra instructions conflict with the sources, follow the sources and adapt the structure accordingly.',
      );
      parts.push(
        '\nExpand each approved section to match both its estimatedMinutes and its target word budget. A 2-minute section should usually contain multiple developed exchanges or a fully developed narrated subsection, not a single quick pass.',
      );

      if (instructions) {
        parts.push(`\n\n# Additional Instructions\n${instructions}`);
      }

      parts.push(`\n\n# TTS Speech Annotations

The script will be read aloud by a text-to-speech engine that supports inline annotations.
Include these annotations naturally in each speaker's lines to make the audio more expressive and human.

Available annotations:
- Non-speech sounds: [sigh], [laughing], [chuckling], [clearing throat], [gasp], [uhm], [uh], [hmm]
- Style modifiers: [whispering], [shouting], [sarcasm], [extremely fast], [slowly]
- Pacing/pauses: [short pause], [medium pause], [long pause]

Guidelines:
- Use pauses to create natural conversational rhythm - e.g., [short pause] before answering a question, [medium pause] at topic transitions
- Add reactions that respond to what the other speaker said (e.g., [laughing] after a joke, [hmm] when considering a point)
- Keep it conservative: 1-3 annotations per segment at most. Over-annotating sounds worse than no annotations.
- Vary annotation placement across the episode to maintain natural pacing`);

      return parts.join('');
    },
  });
