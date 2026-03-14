import { Effect } from 'effect';
import type { UIMessage } from 'ai';
import { LLM } from '../../llm/service';
import { chatPersonaSystemPrompt } from '../../prompt-registry/prompts/chat-persona-system';
import { renderPrompt } from '../../prompt-registry/render';
import { withAIUsageScope } from '../../usage/scope';

export interface StreamPersonaChatInput {
  readonly messages: UIMessage[];
}

export const streamPersonaChat = (input: StreamPersonaChatInput) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    return yield* llm.streamText({
      system: renderPrompt(chatPersonaSystemPrompt),
      messages: input.messages,
      maxTokens: 1024,
      temperature: 0.7,
    });
  }).pipe(
    withAIUsageScope({ operation: 'useCase.streamPersonaChat' }),
    Effect.withSpan('useCase.streamPersonaChat', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
