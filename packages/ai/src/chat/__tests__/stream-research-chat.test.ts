import { it } from '@effect/vitest';
import { describe, expect, vi } from 'vitest';
import { Effect, Layer } from 'effect';
import { LLM, type LLMService } from '../../llm/service';
import { streamResearchChat } from '../use-cases/stream-research-chat';
import type { UIMessage } from 'ai';

// We can't actually call streamText with a mock model (it needs a real LanguageModel),
// so we mock the `ai` module to verify the use case passes correct args.
const mockStreamText = vi.fn();
const mockConvertToModelMessages = vi.fn();

vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai');
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
    parts: [{ type: 'text', text: 'AI in healthcare' }],
  },
];

describe('streamResearchChat', () => {
  it.effect('calls streamText with correct system prompt and model', () =>
    Effect.gen(function* () {
      const mockModelMessages = [
        { role: 'user' as const, content: 'AI in healthcare' },
      ];
      const mockStream = new ReadableStream();

      mockConvertToModelMessages.mockResolvedValue(mockModelMessages);
      mockStreamText.mockReturnValue({
        toUIMessageStream: () => mockStream,
      });

      const result = yield* streamResearchChat({ messages: testMessages });

      expect(mockConvertToModelMessages).toHaveBeenCalledWith(testMessages);
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: mockModel,
          system: expect.stringContaining('research topic refinement'),
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

      const exit = yield* streamResearchChat({ messages: testMessages }).pipe(
        Effect.exit,
      );

      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(MockLLMLayer)),
  );
});
