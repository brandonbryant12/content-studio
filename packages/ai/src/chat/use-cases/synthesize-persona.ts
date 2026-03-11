import { Effect, Schema } from 'effect';
import type { UIMessage } from 'ai';
import { LLM } from '../../llm/service';
import {
  chatSynthesizePersonaSystemPrompt,
  renderPrompt,
} from '../../prompt-registry';
import { withAIUsageScope } from '../../usage';
import {
  formatMessagesForSynthesis,
  normalizeStringWithFallback,
} from './chat-message-utils';

const SynthesisResult = Schema.Struct({
  name: Schema.String,
  role: Schema.String,
  personalityDescription: Schema.String,
  speakingStyle: Schema.String,
  exampleQuotes: Schema.Array(Schema.String),
  voiceId: Schema.String,
  voiceName: Schema.String,
});

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
    name: normalizeStringWithFallback(result.name, 'Podcast Persona'),
    role: normalizeStringWithFallback(result.role, 'Podcast Co-Host'),
    personalityDescription: normalizeStringWithFallback(
      result.personalityDescription,
      'Confident, insightful, and engaging communicator.',
    ),
    speakingStyle: normalizeStringWithFallback(
      result.speakingStyle,
      'Conversational, concise, and audience-focused.',
    ),
    exampleQuotes: exampleQuotes.length > 0 ? exampleQuotes : [FALLBACK_QUOTE],
    voiceId: normalizeStringWithFallback(result.voiceId, FALLBACK_VOICE),
    voiceName: normalizeStringWithFallback(result.voiceName, FALLBACK_VOICE),
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
        system: renderPrompt(chatSynthesizePersonaSystemPrompt),
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
    withAIUsageScope({ operation: 'useCase.synthesizePersona' }),
    Effect.withSpan('useCase.synthesizePersona', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
