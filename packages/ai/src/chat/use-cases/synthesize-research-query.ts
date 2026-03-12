import { Effect, Schema } from 'effect';
import type { UIMessage } from 'ai';
import { LLM } from '../../llm/service';
import {
  chatSynthesizeResearchQuerySystemPrompt,
  renderPrompt,
} from '../../prompt-registry';
import { withAIUsageScope } from '../../usage';
import {
  buildSynthesisPrompts,
  getMessageText,
  normalizeStringWithFallback,
} from './chat-message-utils';
import { generateStructuredWithFallback } from './structured-generation-utils';

const SynthesisResult = Schema.Struct({
  query: Schema.String,
  title: Schema.String,
});

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
  const normalizedTopic = normalizeStringWithFallback(
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
  const fallback = messages.reduceRight<UIMessage | undefined>(
    (lastUserMessage, message) =>
      lastUserMessage ?? (message.role === 'user' ? message : undefined),
    undefined,
  );

  return normalizeStringWithFallback(
    fallback ? getMessageText(fallback) : '',
    'Research this topic using the latest conversation context.',
  );
}

export interface SynthesizeResearchQueryInput {
  readonly messages: UIMessage[];
}

export const synthesizeResearchQuery = (input: SynthesizeResearchQueryInput) =>
  Effect.gen(function* () {
    const llm = yield* LLM;

    const { primary: primaryPrompt, fallback: fallbackPrompt } =
      buildSynthesisPrompts(input.messages);

    const result = yield* generateStructuredWithFallback({
      llm,
      system: renderPrompt(chatSynthesizeResearchQuerySystemPrompt),
      schema: SynthesisResult,
      primary: { prompt: primaryPrompt, temperature: 0.3, maxTokens: 2048 },
      fallback: { prompt: fallbackPrompt, temperature: 0.2, maxTokens: 1024 },
    });

    const fallbackTopic = getFallbackTopic(input.messages);
    return {
      query: normalizeStringWithFallback(
        result.object.query,
        buildFallbackResearchBrief(fallbackTopic),
      ),
      title: normalizeStringWithFallback(
        result.object.title,
        buildFallbackTitle(fallbackTopic),
      ),
    };
  }).pipe(
    withAIUsageScope({ operation: 'useCase.synthesizeResearchQuery' }),
    Effect.withSpan('useCase.synthesizeResearchQuery', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
