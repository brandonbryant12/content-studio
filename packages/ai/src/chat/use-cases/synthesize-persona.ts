import { Effect, Schema } from 'effect';
import type { UIMessage } from 'ai';
import { LLM } from '../../llm/service';
import {
  chatSynthesizePersonaSystemPrompt,
  renderPrompt,
} from '../../prompt-registry';
import { withAIUsageScope } from '../../usage';
import {
  buildSynthesisPrompts,
  normalizeStringWithFallback,
} from './chat-message-utils';
import { generateStructuredWithFallback } from './structured-generation-utils';

const SynthesisResult = Schema.Struct({
  name: Schema.String,
  role: Schema.String,
  personalityDescription: Schema.String,
  speakingStyle: Schema.String,
  exampleQuotes: Schema.Array(Schema.String),
  voiceId: Schema.String,
  voiceName: Schema.String,
});

const FALLBACK_QUOTE = 'Let us unpack this topic with clarity and curiosity.';
const FALLBACK_VOICE = 'Puck';

function normalizeExampleQuotes(quotes: readonly string[]) {
  const normalized = quotes
    .map((quote) => quote.trim())
    .filter((quote) => quote.length > 0)
    .slice(0, 3);

  return normalized.length > 0 ? normalized : [FALLBACK_QUOTE];
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
    exampleQuotes: normalizeExampleQuotes(result.exampleQuotes),
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

    const { primary: primaryPrompt, fallback: fallbackPrompt } =
      buildSynthesisPrompts(input.messages);

    const primaryResult = yield* generateStructuredWithFallback({
      llm,
      system: renderPrompt(chatSynthesizePersonaSystemPrompt),
      schema: SynthesisResult,
      primary: { prompt: primaryPrompt, temperature: 0.3, maxTokens: 1024 },
      // Lengthy conversations can degrade structured output reliability.
      // Retry once with a compact context window before surfacing the error.
      fallback: { prompt: fallbackPrompt, temperature: 0.2, maxTokens: 768 },
    });

    return normalizeSynthesisResult(primaryResult.object);
  }).pipe(
    withAIUsageScope({ operation: 'useCase.synthesizePersona' }),
    Effect.withSpan('useCase.synthesizePersona', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
