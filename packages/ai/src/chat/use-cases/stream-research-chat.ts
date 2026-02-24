import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  type LanguageModel,
} from 'ai';
import { Effect } from 'effect';
import { LLM } from '../../llm/service';
import { chatResearchSystemPrompt, renderPrompt } from '../../prompt-registry';

export interface StreamResearchChatInput {
  readonly messages: UIMessage[];
}

export const streamResearchChat = (input: StreamResearchChatInput) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    const model = llm.model as LanguageModel;

    const modelMessages = yield* Effect.promise(() =>
      convertToModelMessages(input.messages),
    );

    const result = streamText({
      model,
      system: renderPrompt(chatResearchSystemPrompt),
      messages: modelMessages,
      maxOutputTokens: 1024,
      temperature: 0.7,
    });

    return result.toUIMessageStream();
  }).pipe(
    Effect.withSpan('useCase.streamResearchChat', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
