import { it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { describe, expect, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { LLM, type LLMService } from '../../../llm/service';
import { streamWritingAssistantChat } from '../stream-writing-assistant-chat';

const mockStreamText = vi.fn();

const MockLLMLayer: Layer.Layer<LLM> = Layer.succeed(LLM, {
  generate: () => Effect.die('not used'),
  streamText: mockStreamText,
} satisfies LLMService);

const testMessages: UIMessage[] = [
  {
    id: '1',
    role: 'user',
    parts: [{ type: 'text', text: 'Help me rewrite my intro narration.' }],
  },
];

const transcript =
  'Welcome to our show. Today we cover practical AI delivery for teams.';

describe('streamWritingAssistantChat', () => {
  it.effect('calls llm.streamText with writing assistant tools', () =>
    Effect.gen(function* () {
      const mockStream = new ReadableStream();
      mockStreamText.mockReturnValueOnce(Effect.succeed(mockStream));

      const result = yield* streamWritingAssistantChat({
        messages: testMessages,
        transcript,
      });

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('voiceover narration'),
          messages: testMessages,
          tools: expect.objectContaining({
            updateVoiceoverText: expect.any(Object),
          }),
          maxTokens: 1024,
          temperature: 0.7,
        }),
      );
      expect(result).toBe(mockStream);
    }).pipe(Effect.provide(MockLLMLayer)),
  );

  it.effect('propagates errors from llm.streamText', () =>
    Effect.gen(function* () {
      mockStreamText.mockReturnValueOnce(
        Effect.fail(new Error('stream failed')),
      );

      const exit = yield* streamWritingAssistantChat({
        messages: testMessages,
        transcript,
      }).pipe(Effect.exit);

      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(MockLLMLayer)),
  );
});
