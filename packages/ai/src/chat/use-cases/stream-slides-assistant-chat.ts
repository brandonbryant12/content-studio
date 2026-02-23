import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  type LanguageModel,
} from 'ai';
import { Effect } from 'effect';
import { LLM } from '../../llm/service';

const SLIDES_ASSISTANT_SYSTEM_PROMPT = `You are a presentation assistant for Content Studio slide decks.

Your job is to help users improve slide structure, messaging, and visual clarity.

## Behavior
1. Give concrete, actionable suggestions for slide-level edits.
2. When asked to rewrite content, return concise alternatives users can paste directly.
3. Distinguish between global deck changes (theme, narrative flow) and local slide changes.
4. If context is missing, ask one focused clarification question.

## Guardrails
- Keep responses concise and practical.
- Avoid claiming changes were saved automatically.
- Do not output JSON unless the user explicitly requests structured output.`;

export interface StreamSlidesAssistantChatInput {
  readonly messages: UIMessage[];
}

export const streamSlidesAssistantChat = (
  input: StreamSlidesAssistantChatInput,
) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    const model = llm.model as LanguageModel;

    const modelMessages = yield* Effect.promise(() =>
      convertToModelMessages(input.messages),
    );

    const result = streamText({
      model,
      system: SLIDES_ASSISTANT_SYSTEM_PROMPT,
      messages: modelMessages,
      maxOutputTokens: 1024,
      temperature: 0.6,
    });

    return result.toUIMessageStream();
  }).pipe(
    Effect.withSpan('useCase.streamSlidesAssistantChat', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
