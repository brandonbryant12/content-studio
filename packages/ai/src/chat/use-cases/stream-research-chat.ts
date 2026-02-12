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
2. Ask 1-2 focused clarifying questions to narrow the scope.
3. After the user answers, synthesize into a well-structured research query.
4. Present the refined query clearly, prefixed with "**Refined Research Query:**" on its own line.
5. Ask if they want to adjust anything or if they're ready to start.

## Guidelines:
- Keep responses concise (2-4 short paragraphs max)
- Be conversational but efficient — don't over-ask
- If the initial topic is already very specific, skip to presenting the refined query
- Always produce a refined query after at most 2 rounds of clarification
- Do NOT perform actual research — only refine the query`;

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
