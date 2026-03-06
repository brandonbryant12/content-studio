import { it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { describe, expect, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { LLM, type LLMService } from '../../../llm/service';
import { streamResearchChat } from '../stream-research-chat';

const mockStreamText = vi.fn();

const MockLLMLayer: Layer.Layer<LLM> = Layer.succeed(LLM, {
  generate: () => Effect.die('not used'),
  streamText: mockStreamText,
} satisfies LLMService);

const testMessages: UIMessage[] = [
  {
    id: '1',
    role: 'user',
    parts: [{ type: 'text', text: 'AI in healthcare' }],
  },
];

describe('streamResearchChat', () => {
  it.effect('calls llm.streamText with the research prompt', () =>
    Effect.gen(function* () {
      const mockStream = new ReadableStream();
      mockStreamText.mockReturnValueOnce(Effect.succeed(mockStream));

      const result = yield* streamResearchChat({ messages: testMessages });

      expect(mockStreamText).toHaveBeenCalledWith({
        system: expect.stringContaining('research topic refinement'),
        messages: testMessages,
        maxTokens: 1024,
        temperature: 0.7,
      });
      expect(result).toBe(mockStream);
    }).pipe(Effect.provide(MockLLMLayer)),
  );

  it.effect('propagates errors from llm.streamText', () =>
    Effect.gen(function* () {
      mockStreamText.mockReturnValueOnce(
        Effect.fail(new Error('stream failed')),
      );

      const exit = yield* streamResearchChat({ messages: testMessages }).pipe(
        Effect.exit,
      );

      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(MockLLMLayer)),
  );
});
