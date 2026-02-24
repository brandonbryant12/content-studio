import {
  renderPrompt,
  voiceoverPreprocessSystemPrompt,
  voiceoverPreprocessUserPrompt,
  type VoiceoverPreprocessUserPromptInput,
} from '@repo/ai/prompt-registry';
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
export type PreprocessContext = VoiceoverPreprocessUserPromptInput;

/**
 * Build the system prompt for voiceover TTS preprocessing.
 * Documents all Gemini TTS inline annotations and instructs the LLM
 * to add them conservatively without rewriting the user's text.
 */
export const buildVoiceoverSystemPrompt = (): string =>
  renderPrompt(voiceoverPreprocessSystemPrompt);

/**
 * Build the user prompt for voiceover preprocessing.
 * Programmatically appends title instruction only when needed.
 */
export const buildVoiceoverUserPrompt = (context: PreprocessContext): string =>
  renderPrompt(voiceoverPreprocessUserPrompt, context);
