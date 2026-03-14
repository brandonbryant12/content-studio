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

const draft =
  'Welcome to our show. Today we cover practical AI delivery for teams.';

function createUserMessage(text: string): UIMessage {
  return {
    id: '1',
    role: 'user',
    parts: [{ type: 'text', text }],
  };
}

describe('streamWritingAssistantChat', () => {
  it.effect('forces the draft write tool for direct edit requests', () =>
    Effect.gen(function* () {
      const mockStream = new ReadableStream();
      mockStreamText.mockReturnValueOnce(Effect.succeed(mockStream));
      const messages = [
        createUserMessage('Help me rewrite my intro narration.'),
      ];

      const result = yield* streamWritingAssistantChat({
        messages,
        documentKind: 'voiceover',
        draft,
      });

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('voiceover narration'),
          messages,
          tools: expect.objectContaining({
            updateDraftText: expect.any(Object),
          }),
          toolChoice: {
            type: 'tool',
            toolName: 'updateDraftText',
          },
          maxTokens: 1024,
          temperature: 0.7,
        }),
      );
      expect(result).toBe(mockStream);
    }).pipe(Effect.provide(MockLLMLayer)),
  );

  it.effect('includes podcast-specific speaker guidance when requested', () =>
    Effect.gen(function* () {
      const mockStream = new ReadableStream();
      mockStreamText.mockReturnValueOnce(Effect.succeed(mockStream));
      const messages = [
        createUserMessage(
          'Rewrite the host intro and tighten the co-host response.',
        ),
      ];

      yield* streamWritingAssistantChat({
        messages,
        documentKind: 'podcast',
        draft: '[Alex]\nKick us off.\n\n[Blair]\nReact to the setup.',
        speakerNames: ['Alex', 'Blair'],
      });

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('podcast script'),
          tools: expect.objectContaining({
            updatePodcastScript: expect.any(Object),
          }),
          toolChoice: {
            type: 'tool',
            toolName: 'updatePodcastScript',
          },
        }),
      );
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining(
            'Use only these exact speaker labels in `segments[].speaker`: Alex, Blair.',
          ),
        }),
      );
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining(
            'Keep inline text like `Key statistic: Revenue rose 20%.` inside `line`',
          ),
        }),
      );
    }).pipe(Effect.provide(MockLLMLayer)),
  );

  it.effect('leaves tool choice automatic for critique-style questions', () =>
    Effect.gen(function* () {
      const mockStream = new ReadableStream();
      mockStreamText.mockReturnValueOnce(Effect.succeed(mockStream));
      const messages = [
        createUserMessage('What makes this opening sound flat to you?'),
      ];

      yield* streamWritingAssistantChat({
        messages,
        documentKind: 'voiceover',
        draft,
      });

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages,
          toolChoice: undefined,
        }),
      );
    }).pipe(Effect.provide(MockLLMLayer)),
  );

  it.effect('propagates errors from llm.streamText', () =>
    Effect.gen(function* () {
      mockStreamText.mockReturnValueOnce(
        Effect.fail(new Error('stream failed')),
      );
      const messages = [
        createUserMessage('Help me rewrite my intro narration.'),
      ];

      const exit = yield* streamWritingAssistantChat({
        messages,
        documentKind: 'voiceover',
        draft,
      }).pipe(Effect.exit);

      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(MockLLMLayer)),
  );
});
