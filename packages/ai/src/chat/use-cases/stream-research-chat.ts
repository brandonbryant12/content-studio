import { Effect } from 'effect';
import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  type LanguageModel,
} from 'ai';
import { LLM } from '../../llm/service';

const RESEARCH_SYSTEM_PROMPT = `You are a research topic refinement assistant for Content Studio.

Your job is to help the user clarify and optimize their research topic before a deep AI research agent processes it.

## Your behavior:
1. When the user provides a topic, evaluate whether it is specific enough for deep research.
2. Ask 1-2 focused clarifying questions to narrow the scope — things like target audience, specific angles, time period, or depth of coverage.
3. Be conversational and helpful. The user will click a button to start research when ready.

## Guidelines:
- Keep responses concise (2-4 short paragraphs max)
- Be conversational but efficient — don't over-ask
- Do NOT perform actual research — only help refine the topic
- Do NOT output any special formatting or structured queries — just have a natural conversation`;

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
      system: RESEARCH_SYSTEM_PROMPT,
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
