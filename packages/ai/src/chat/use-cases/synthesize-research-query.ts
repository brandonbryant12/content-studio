import { Effect, Schema } from 'effect';
import type { UIMessage } from 'ai';
import { LLM } from '../../llm/service';
import {
  chatSynthesizeResearchQuerySystemPrompt,
  renderPrompt,
} from '../../prompt-registry';
import {
  formatMessagesForSynthesis,
  getMessageText,
} from './chat-message-utils';

const SynthesisResult = Schema.Struct({
  query: Schema.String,
  title: Schema.String,
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

function ensureSentence(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) return '';
  if (/[.!?]$/.test(normalized)) return normalized;
  return `${normalized}.`;
}

function buildFallbackResearchBrief(topic: string) {
  const normalizedTopic = normalizeString(
    topic,
    'the topic from the current conversation',
  );
  const objective = ensureSentence(normalizedTopic);

  return [
    `Research objective: ${objective}`,
    'Assumed scope (if not otherwise specified): prioritize the latest 2-3 years of high-quality sources and include older context only when needed for historical comparison.',
    'Deliverable requirements: summarize key findings, major areas of agreement/disagreement, and practical implications, with source-backed evidence for each major claim.',
  ].join(' ');
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
        system: renderPrompt(chatSynthesizeResearchQuerySystemPrompt),
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
      query: normalizeString(
        result.object.query,
        buildFallbackResearchBrief(fallbackTopic),
      ),
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
