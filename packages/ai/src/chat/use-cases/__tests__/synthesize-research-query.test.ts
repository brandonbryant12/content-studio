import { it } from '@effect/vitest';
import { Effect } from 'effect';
import { describe, expect, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { LLMError } from '../../../errors';
import { createMockLLM, type MockLLMGenerate } from '../../../testing/llm';
import { synthesizeResearchQuery } from '../synthesize-research-query';

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
    const generate = vi.fn<MockLLMGenerate>().mockReturnValue(
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
      }).pipe(Effect.provide(createMockLLM({ generate })));

      const firstCall = generate.mock.calls[0]?.[0];
      expect(firstCall).toBeDefined();
      if (!firstCall) {
        return;
      }
      expect(firstCall.prompt).not.toContain('[[START_RESEARCH]]');
      expect(result.title).toBe('AI Healthcare Policy Trends');
    });
  });

  it.effect('retries with compact context after LLMError', () =>
    Effect.gen(function* () {
      const generate = vi
        .fn<MockLLMGenerate>()
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
      }).pipe(Effect.provide(createMockLLM({ generate })));

      expect(generate).toHaveBeenCalledTimes(2);
      const firstPrompt = generate.mock.calls[0]?.[0]?.prompt as string;
      const fallbackPrompt = generate.mock.calls[1]?.[0]?.prompt as string;
      expect(fallbackPrompt.length).toBeLessThanOrEqual(firstPrompt.length);
      expect(result.query).toContain('healthcare');
    }),
  );
});
