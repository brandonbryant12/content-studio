import { Effect, Schema } from 'effect';
import type { UIMessage } from 'ai';
import { LLM } from '../../llm/service';
import { formatMessagesForSynthesis } from './chat-message-utils';

const SynthesisResult = Schema.Struct({
  name: Schema.String,
  role: Schema.String,
  personalityDescription: Schema.String,
  speakingStyle: Schema.String,
  exampleQuotes: Schema.Array(Schema.String),
  voiceId: Schema.String,
  voiceName: Schema.String,
});

const SYSTEM_PROMPT = `You are a persona synthesizer for Content Studio.

Given a conversation between a user and a persona creation assistant, synthesize the discussion into a structured persona definition:
1. A name for the persona (can be a real-sounding name or a character name)
2. A brief role description (e.g., "Tech Industry Analyst", "Science Communicator")
3. A personality description capturing their traits and background
4. A speaking style description (tone, patterns, verbal habits)
5. 2-3 example quotes that capture how this persona would speak
6. A voice that best matches the persona's character from the available voices

## Available Voices
Female:
- Aoede — Melodic and engaging
- Kore — Youthful and energetic
- Leda — Friendly and approachable
- Zephyr — Light and airy

Male:
- Charon — Clear and professional
- Fenrir — Bold and dynamic
- Puck — Lively and engaging
- Orus — Friendly and conversational

Set voiceId and voiceName to the voice name (e.g. voiceId: "Puck", voiceName: "Puck").
Pick the voice that best matches the persona's personality, energy level, and speaking style.

Focus on creating a vivid, distinctive character based on the conversation.`;

const PRIMARY_FORMAT_OPTIONS = {
  maxMessages: 24,
  maxCharsPerMessage: 700,
  maxTotalChars: 12_000,
} as const;

const FALLBACK_FORMAT_OPTIONS = {
  maxMessages: 10,
  maxCharsPerMessage: 300,
  maxTotalChars: 4_000,
} as const;

const FALLBACK_QUOTE = 'Let us unpack this topic with clarity and curiosity.';
const FALLBACK_VOICE = 'Puck';

function normalizeString(value: string, fallback: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeSynthesisResult(result: {
  readonly name: string;
  readonly role: string;
  readonly personalityDescription: string;
  readonly speakingStyle: string;
  readonly exampleQuotes: readonly string[];
  readonly voiceId: string;
  readonly voiceName: string;
}) {
  const exampleQuotes = result.exampleQuotes
    .map((quote) => quote.trim())
    .filter((quote) => quote.length > 0)
    .slice(0, 3);

  return {
    name: normalizeString(result.name, 'Podcast Persona'),
    role: normalizeString(result.role, 'Podcast Co-Host'),
    personalityDescription: normalizeString(
      result.personalityDescription,
      'Confident, insightful, and engaging communicator.',
    ),
    speakingStyle: normalizeString(
      result.speakingStyle,
      'Conversational, concise, and audience-focused.',
    ),
    exampleQuotes: exampleQuotes.length > 0 ? exampleQuotes : [FALLBACK_QUOTE],
    voiceId: normalizeString(result.voiceId, FALLBACK_VOICE),
    voiceName: normalizeString(result.voiceName, FALLBACK_VOICE),
  };
}

export interface SynthesizePersonaInput {
  readonly messages: UIMessage[];
}

export const synthesizePersona = (input: SynthesizePersonaInput) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    const generate = (prompt: string, temperature: number, maxTokens: number) =>
      llm.generate({
        system: SYSTEM_PROMPT,
        prompt,
        schema: SynthesisResult,
        temperature,
        maxTokens,
      });

    const primaryPrompt = formatMessagesForSynthesis(
      input.messages,
      PRIMARY_FORMAT_OPTIONS,
    );
    const fallbackPrompt = formatMessagesForSynthesis(
      input.messages,
      FALLBACK_FORMAT_OPTIONS,
    );

    const primaryResult = yield* generate(primaryPrompt, 0.3, 1024).pipe(
      // Lengthy conversations can degrade structured output reliability.
      // Retry once with a compact context window before surfacing the error.
      Effect.catchTag('LLMError', () => generate(fallbackPrompt, 0.2, 768)),
    );

    return normalizeSynthesisResult(primaryResult.object);
  }).pipe(
    Effect.withSpan('useCase.synthesizePersona', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
