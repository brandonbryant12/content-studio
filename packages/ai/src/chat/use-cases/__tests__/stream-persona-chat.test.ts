import { it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { describe, expect, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { LLM, type LLMService } from '../../../llm/service';
import { streamPersonaChat } from '../stream-persona-chat';

const mockStreamText = vi.fn();

const MockLLMLayer: Layer.Layer<LLM> = Layer.succeed(LLM, {
  generate: () => Effect.die('not used'),
  streamText: mockStreamText,
} satisfies LLMService);

const testMessages: UIMessage[] = [
  {
    id: '1',
    role: 'user',
    parts: [{ type: 'text', text: 'I want a practical AI policy co-host.' }],
  },
];

describe('streamPersonaChat', () => {
  it.effect('calls llm.streamText with persona prompt', () =>
    Effect.gen(function* () {
      const mockStream = new ReadableStream();
      mockStreamText.mockReturnValueOnce(Effect.succeed(mockStream));

      const result = yield* streamPersonaChat({ messages: testMessages });

      expect(mockStreamText).toHaveBeenCalledWith({
        system: expect.stringContaining('persona creation assistant'),
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

      const exit = yield* streamPersonaChat({ messages: testMessages }).pipe(
        Effect.exit,
      );

      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(MockLLMLayer)),
  );
});
