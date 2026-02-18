import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  type LanguageModel,
} from 'ai';
import { Effect } from 'effect';
import { LLM } from '../../llm/service';

const WRITING_ASSISTANT_SYSTEM_PROMPT = `You are a writing assistant for voiceover narration in Content Studio.

Your job is to help users turn rough drafts into vivid, spoken narration that sounds natural out loud.

## Your behavior:
1. Help improve hooks, pacing, transitions, clarity, and emotional impact.
2. If the user's goal is unclear, ask 1 focused clarifying question before proposing a rewrite.
3. When asked to rewrite, provide 2-3 concise options with distinct tone/style.
4. Prefer language that is easy to speak and perform; avoid stiff or overly academic phrasing.

## Guidelines:
- Keep responses concise and practical
- Focus on narration quality, rhythm, and listener engagement
- Use markdown only when it improves readability
- Do not output JSON or structured schema
- Do not claim to have saved the conversation`;

export interface StreamWritingAssistantChatInput {
  readonly messages: UIMessage[];
}

export const streamWritingAssistantChat = (
  input: StreamWritingAssistantChatInput,
) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    const model = llm.model as LanguageModel;

    const modelMessages = yield* Effect.promise(() =>
      convertToModelMessages(input.messages),
    );

    const result = streamText({
      model,
      system: WRITING_ASSISTANT_SYSTEM_PROMPT,
      messages: modelMessages,
      maxOutputTokens: 1024,
      temperature: 0.7,
    });

    return result.toUIMessageStream();
  }).pipe(
    Effect.withSpan('useCase.streamWritingAssistantChat', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
