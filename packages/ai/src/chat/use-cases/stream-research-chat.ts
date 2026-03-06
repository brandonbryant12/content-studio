import { Effect } from 'effect';
import type { UIMessage } from 'ai';
import { LLM } from '../../llm/service';
import { chatResearchSystemPrompt, renderPrompt } from '../../prompt-registry';
import { withAIUsageScope } from '../../usage';

export interface StreamResearchChatInput {
  readonly messages: UIMessage[];
}

export const streamResearchChat = (input: StreamResearchChatInput) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    return yield* llm.streamText({
      system: renderPrompt(chatResearchSystemPrompt),
      messages: input.messages,
      maxTokens: 1024,
      temperature: 0.7,
    });
  }).pipe(
    withAIUsageScope({ operation: 'useCase.streamResearchChat' }),
    Effect.withSpan('useCase.streamResearchChat', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
