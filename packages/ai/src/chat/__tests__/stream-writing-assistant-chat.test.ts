import { it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { describe, expect, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { LLM, type LLMService } from '../../llm/service';
import { streamWritingAssistantChat } from '../use-cases/stream-writing-assistant-chat';

const mockStreamText = vi.fn();
const mockConvertToModelMessages = vi.fn();

vi.mock('ai', async () => {
  const actual = await vi.importActual('ai');
  return {
    ...actual,
    streamText: (...args: unknown[]) => mockStreamText(...args),
    convertToModelMessages: (...args: unknown[]) =>
      mockConvertToModelMessages(...args),
  };
});

const mockModel = { modelId: 'mock-model' };

const MockLLMLayer: Layer.Layer<LLM> = Layer.succeed(LLM, {
  model: mockModel,
  generate: () => Effect.die('not used'),
} as unknown as LLMService);

const testMessages: UIMessage[] = [
  {
    id: '1',
    role: 'user',
    parts: [{ type: 'text', text: 'Help me rewrite my intro narration.' }],
  },
];

describe('streamWritingAssistantChat', () => {
  it.effect('calls streamText with writing assistant prompt and model', () =>
    Effect.gen(function* () {
      const mockModelMessages = [
        {
          role: 'user' as const,
          content: 'Help me rewrite my intro narration.',
        },
      ];
      const mockStream = new ReadableStream();

      mockConvertToModelMessages.mockResolvedValue(mockModelMessages);
      mockStreamText.mockReturnValue({
        toUIMessageStream: () => mockStream,
      });

      const result = yield* streamWritingAssistantChat({
        messages: testMessages,
      });

      expect(mockConvertToModelMessages).toHaveBeenCalledWith(testMessages);
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: mockModel,
          system: expect.stringContaining('voiceover narration'),
          messages: mockModelMessages,
          maxOutputTokens: 1024,
          temperature: 0.7,
        }),
      );
      expect(result).toBe(mockStream);
    }).pipe(Effect.provide(MockLLMLayer)),
  );

  it.effect('propagates errors from convertToModelMessages', () =>
    Effect.gen(function* () {
      mockConvertToModelMessages.mockRejectedValue(
        new Error('conversion failed'),
      );

      const exit = yield* streamWritingAssistantChat({
        messages: testMessages,
      }).pipe(Effect.exit);

      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(MockLLMLayer)),
  );
});
