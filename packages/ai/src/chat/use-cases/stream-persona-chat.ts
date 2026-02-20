import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  type LanguageModel,
} from 'ai';
import { Effect } from 'effect';
import { LLM } from '../../llm/service';

const PERSONA_SYSTEM_PROMPT = `You are a podcast persona creation assistant for Content Studio.

Your job is to help the user define a compelling podcast persona — a character with a distinct voice, personality, and speaking style.

## Your behavior:
1. When the user describes a persona idea, help flesh it out with questions about personality traits, speaking style, and unique characteristics.
2. Ask focused clarifying questions only when needed. Hard limit: at most 2 follow-up questions across the whole conversation.
3. Once you have enough context (or you hit the follow-up limit), stop asking questions and confirm readiness.
4. End that readiness response with the exact token [[CREATE_PERSONA]].

## Guidelines:
- Keep responses concise (2-4 short paragraphs max)
- Be conversational but efficient — don't over-ask
- Help the user think about what makes this persona distinctive
- Consider speaking style, personality quirks, expertise areas, and how they'd interact with other hosts
- Do NOT output any structured data — just have a natural conversation
- Include [[CREATE_PERSONA]] only when the conversation is ready to proceed`;

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
      system: PERSONA_SYSTEM_PROMPT,
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
