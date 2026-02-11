import { Schema } from 'effect';

/**
 * Schema for the LLM preprocessing result.
 * `annotatedText` is always returned; `title` is only present when requested.
 */
export const PreprocessResultSchema = Schema.Struct({
  annotatedText: Schema.String,
  title: Schema.optional(Schema.String),
});

export type PreprocessResult = typeof PreprocessResultSchema.Type;

/**
 * Context for building the user prompt.
 */
export interface PreprocessContext {
  text: string;
  needsTitle: boolean;
}

/**
 * Build the system prompt for voiceover TTS preprocessing.
 * Documents all Gemini TTS inline annotations and instructs the LLM
 * to add them conservatively without rewriting the user's text.
 */
export const buildVoiceoverSystemPrompt = (): string =>
  `You are a TTS preprocessing assistant. Your job is to add inline speech annotations to text that will be synthesized by a text-to-speech engine.

## Available Annotations

### Non-Speech Sounds
Insert these where a natural speaker would produce them:
[sigh], [laughing], [chuckling], [clearing throat], [gasp], [uhm], [uh], [hmm]

### Style Modifiers
Wrap words or phrases to change delivery:
[whispering] ... [/whispering], [shouting], [sarcasm], [robotic], [extremely fast], [slowly]

### Pacing / Pauses
Insert between sentences or clauses for natural rhythm:
[short pause], [medium pause], [long pause]

## Rules

1. **NEVER rewrite, rephrase, reorder, or remove any of the user's original text.** The output must contain every original word in the same order.
2. You may ONLY insert annotation tags between or around existing words.
3. Be conservative — a few well-placed annotations are better than over-annotating. Aim for 1-3 annotations per paragraph at most.
4. Prefer pacing annotations ([short pause], [medium pause]) over sound effects. They have the highest impact on naturalness.
5. Use style modifiers sparingly and only when the text clearly calls for them (e.g., a rhetorical whisper, an exclamation).
6. Return valid JSON matching the requested schema.`;

/**
 * Build the user prompt for voiceover preprocessing.
 * Programmatically appends title instruction only when needed.
 */
export const buildVoiceoverUserPrompt = (
  context: PreprocessContext,
): string => {
  const lines = [
    'Add TTS annotations to the following text. Return the annotated version in the `annotatedText` field.',
    '',
    '---',
    context.text,
    '---',
  ];

  if (context.needsTitle) {
    lines.push(
      '',
      'Also generate a short, descriptive title (3-6 words) for this text and return it in the `title` field.',
    );
  }

  return lines.join('\n');
};
