import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  type LanguageModel,
} from 'ai';
import { Effect } from 'effect';
import { LLM } from '../../llm/service';

const SVG_SYSTEM_PROMPT = `You are an SVG creation assistant for Content Studio.

Your job is to generate clean, well-structured SVG markup based on the user's description.

## Your behavior:
1. When the user describes what they want, generate a complete SVG.
2. Always output the COMPLETE SVG - not fragments or diffs.
3. When the user asks for changes, output the FULL updated SVG.
4. Wrap your SVG output in a code block.

## SVG Guidelines:
- Use viewBox attribute (no fixed width/height)
- Use semantic grouping with <g> elements
- Keep paths optimized - avoid unnecessary precision
- Use descriptive IDs and classes where helpful
- Prefer clean, minimal SVG - avoid unnecessary transforms
- Use gradients, patterns, and filters for visual richness
- Support dark/light themes via currentColor where appropriate`;

export interface StreamSvgChatInput {
  readonly messages: UIMessage[];
  readonly onFinish?: (text: string) => Promise<void>;
  readonly onAbort?: () => Promise<void>;
}

export const streamSvgChat = (input: StreamSvgChatInput) =>
  Effect.gen(function* () {
    const llm = yield* LLM;
    const model = llm.model as LanguageModel;

    const modelMessages = yield* Effect.promise(() =>
      convertToModelMessages(input.messages),
    );

    const result = streamText({
      model,
      system: SVG_SYSTEM_PROMPT,
      messages: modelMessages,
      maxOutputTokens: 16384,
      temperature: 0.7,
      onFinish: input.onFinish
        ? async ({ text }) => {
            await input.onFinish!(text);
          }
        : undefined,
      onAbort: input.onAbort
        ? async () => {
            await input.onAbort!();
          }
        : undefined,
    });

    return result.toUIMessageStream();
  }).pipe(
    Effect.withSpan('useCase.streamSvgChat', {
      attributes: { 'chat.messageCount': input.messages.length },
    }),
  );
