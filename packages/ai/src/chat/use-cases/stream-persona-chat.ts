import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  type LanguageModel,
} from 'ai';
import { Effect } from 'effect';
import { LLM } from '../../llm/service';
import { chatPersonaSystemPrompt, renderPrompt } from '../../prompt-registry';

export interface StreamPersonaChatInput {
  readonly messages: UIMessage[];
}

export const streamPersonaChat = (input: StreamPersonaChatInput) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    const model = llm.model as LanguageModel;

    const modelMessages = yield* Effect.promise(() =>
      convertToModelMessages(input.messages),
    );

    const result = streamText({
      model,
      system: renderPrompt(chatPersonaSystemPrompt),
      messages: modelMessages,
      maxOutputTokens: 1024,
      temperature: 0.7,
    });

    return result.toUIMessageStream();
  }).pipe(
    Effect.withSpan('useCase.streamPersonaChat', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
