import { Effect, Schema } from 'effect';
import type { UIMessage } from 'ai';
import { LLM } from '../../llm/service';
import {
  formatMessagesForSynthesis,
  getMessageText,
} from './chat-message-utils';

const SynthesisResult = Schema.Struct({
  query: Schema.String,
  title: Schema.String,
});

const SYSTEM_PROMPT = `You are a research query synthesizer for Content Studio.

Given a conversation between a user and a research assistant, synthesize the discussion into:
1. A focused research query (2-4 sentences max) that captures the user's intent and any refinements from the conversation.
2. A concise title (5-10 words) suitable for labeling the research document.

Keep the query brief and specific. Do not elaborate beyond what was discussed.`;

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

function normalizeString(value: string, fallback: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function buildFallbackTitle(topic: string) {
  const words = topic
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 8);
  return words.join(' ') || 'Research Brief';
}

function getFallbackTopic(messages: readonly UIMessage[]) {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user');
  const fallback = latestUserMessage ? getMessageText(latestUserMessage) : '';
  return normalizeString(
    fallback,
    'Research this topic using the latest conversation context.',
  );
}

export interface SynthesizeResearchQueryInput {
  readonly messages: UIMessage[];
}

export const synthesizeResearchQuery = (input: SynthesizeResearchQueryInput) =>
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

    const result = yield* generate(primaryPrompt, 0.3, 2048).pipe(
      Effect.catchTag('LLMError', () => generate(fallbackPrompt, 0.2, 1024)),
    );

    const fallbackTopic = getFallbackTopic(input.messages);
    return {
      query: normalizeString(result.object.query, fallbackTopic),
      title: normalizeString(
        result.object.title,
        buildFallbackTitle(fallbackTopic),
      ),
    };
  }).pipe(
    Effect.withSpan('useCase.synthesizeResearchQuery', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
