import { Effect, Schema } from 'effect';
import type { UIMessage } from 'ai';
import { LLM } from '../../llm/service';

const SynthesisResult = Schema.Struct({
  query: Schema.String,
  title: Schema.String,
});

const SYSTEM_PROMPT = `You are a research query synthesizer for Content Studio.

Given a conversation between a user and a research assistant, synthesize the discussion into:
1. A focused research query (2-4 sentences max) that captures the user's intent and any refinements from the conversation.
2. A concise title (5-10 words) suitable for labeling the research document.

Keep the query brief and specific. Do not elaborate beyond what was discussed.`;

function formatMessages(messages: UIMessage[]): string {
  return messages
    .map((m) => {
      const text = m.parts
        .filter(
          (p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text',
        )
        .map((p) => p.text)
        .join('');
      return `${m.role === 'user' ? 'User' : 'Assistant'}: ${text}`;
    })
    .join('\n\n');
}

export interface SynthesizeResearchQueryInput {
  readonly messages: UIMessage[];
}

export const synthesizeResearchQuery = (input: SynthesizeResearchQueryInput) =>
  Effect.gen(function* () {
    const llm = yield* LLM;

    const result = yield* llm.generate({
      system: SYSTEM_PROMPT,
      prompt: formatMessages(input.messages),
      schema: SynthesisResult,
      temperature: 0.3,
      maxTokens: 2048,
    });

    return result.object;
  }).pipe(
    Effect.withSpan('useCase.synthesizeResearchQuery', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
