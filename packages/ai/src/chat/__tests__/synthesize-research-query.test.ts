import { it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { describe, expect, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { LLMError } from '../../errors';
import { LLM, type LLMService } from '../../llm/service';
import { synthesizeResearchQuery } from '../use-cases/synthesize-research-query';

const mockModel = { modelId: 'mock-model' };

function makeLayer(generate: LLMService['generate']) {
  return Layer.succeed(LLM, {
    model: mockModel,
    generate,
  } as unknown as LLMService);
}

function makeConversation(): UIMessage[] {
  return [
    {
      id: 'u1',
      role: 'user',
      parts: [
        { type: 'text', text: 'Research AI in healthcare policy shifts' },
      ],
    },
    {
      id: 'a1',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: 'Great scope. We can proceed [[START_RESEARCH]]',
        },
      ],
    },
  ];
}

describe('synthesizeResearchQuery', () => {
  it.effect('strips control tokens from synthesis prompt', () => {
    const generate = vi.fn().mockReturnValue(
      Effect.succeed({
        object: {
          query: 'AI in healthcare policy shifts from 2024 to 2026.',
          title: 'AI Healthcare Policy Trends',
        },
      }),
    );

    return Effect.gen(function* () {
      const result = yield* synthesizeResearchQuery({
        messages: makeConversation(),
      }).pipe(
        Effect.provide(
          makeLayer(generate as unknown as LLMService['generate']),
        ),
      );

      const firstCall = generate.mock.calls[0]?.[0];
      expect(firstCall?.prompt).toBeDefined();
      expect(firstCall.prompt).not.toContain('[[START_RESEARCH]]');
      expect(result.title).toBe('AI Healthcare Policy Trends');
    });
  });

  it.effect('retries with compact context after LLMError', () =>
    Effect.gen(function* () {
      const generate = vi
        .fn()
        .mockReturnValueOnce(
          Effect.fail(
            new LLMError({
              message: 'Could not return structured object',
              model: 'mock-model',
            }),
          ),
        )
        .mockReturnValueOnce(
          Effect.succeed({
            object: {
              query: 'AI in healthcare policy shifts from 2024 to 2026.',
              title: 'AI Healthcare Policy Trends',
            },
          }),
        );

      const result = yield* synthesizeResearchQuery({
        messages: makeConversation(),
      }).pipe(
        Effect.provide(
          makeLayer(generate as unknown as LLMService['generate']),
        ),
      );

      expect(generate).toHaveBeenCalledTimes(2);
      const firstPrompt = generate.mock.calls[0]?.[0]?.prompt as string;
      const fallbackPrompt = generate.mock.calls[1]?.[0]?.prompt as string;
      expect(fallbackPrompt.length).toBeLessThanOrEqual(firstPrompt.length);
      expect(result.query).toContain('healthcare');
    }),
  );
});
