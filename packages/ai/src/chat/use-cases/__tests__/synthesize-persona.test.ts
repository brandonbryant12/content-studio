import { it } from '@effect/vitest';
import { Effect } from 'effect';
import { describe, expect, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { LLMError } from '../../../errors';
import { createMockLLM, type MockLLMGenerate } from '../../../testing/llm';
import { synthesizePersona } from '../synthesize-persona';

const basePersona = {
  name: 'Jordan Vale',
  role: 'Technology Analyst',
  personalityDescription: 'Curious, practical, and candid.',
  speakingStyle: 'Clear, energetic, and concise.',
  exampleQuotes: ['Lets dive into what matters most.'],
  voiceId: 'Puck',
  voiceName: 'Puck',
} as const;

function makeLongConversation(): UIMessage[] {
  const messages: UIMessage[] = [];
  for (let index = 0; index < 16; index += 1) {
    messages.push({
      id: `u-${index}`,
      role: 'user',
      parts: [
        {
          type: 'text',
          text:
            `Persona detail ${index}. ` +
            'Keep the tone practical and insightful with clear examples. '.repeat(
              8,
            ),
        },
      ],
    });
    messages.push({
      id: `a-${index}`,
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text:
            `Follow-up ${index}. ` +
            'Can you clarify expertise, tone, and audience expectations? '.repeat(
              7,
            ),
        },
      ],
    });
  }

  messages.push({
    id: 'a-ready',
    role: 'assistant',
    parts: [{ type: 'text', text: 'Ready [[CREATE_PERSONA]]' }],
  });

  return messages;
}

describe('synthesizePersona', () => {
  it.effect('removes honorifics and credentials from synthesized names', () => {
    const generate = vi.fn<MockLLMGenerate>().mockReturnValue(
      Effect.succeed({
        object: {
          ...basePersona,
          name: 'Dr. James Naismith, PhD',
        },
      }),
    );

    return Effect.gen(function* () {
      const result = yield* synthesizePersona({
        messages: [
          {
            id: 'u1',
            role: 'user',
            parts: [
              {
                type: 'text',
                text: 'Create a thoughtful basketball history podcast co-host.',
              },
            ],
          },
        ],
      }).pipe(Effect.provide(createMockLLM({ generate })));

      expect(result.name).toBe('James Naismith');
    });
  });

  it.effect('forces voice sex to match explicit conversation cues', () => {
    const generate = vi.fn<MockLLMGenerate>().mockReturnValue(
      Effect.succeed({
        object: {
          ...basePersona,
          name: 'Elena Park',
          voiceId: 'Puck',
          voiceName: 'Puck',
        },
      }),
    );

    return Effect.gen(function* () {
      const result = yield* synthesizePersona({
        messages: [
          {
            id: 'u1',
            role: 'user',
            parts: [
              {
                type: 'text',
                text: 'Create a female economics host named Elena Park with a lively style.',
              },
            ],
          },
        ],
      }).pipe(Effect.provide(createMockLLM({ generate })));

      const firstCall = generate.mock.calls[0]?.[0];
      expect(firstCall).toBeDefined();
      if (!firstCall) {
        return;
      }
      expect(firstCall.prompt).toContain(
        'should use a female voice. Select only from the available female voices',
      );
      expect(result.voiceId).toBe('Aoede');
      expect(result.voiceName).toBe('Aoede');
    });
  });

  it.effect('strips control tokens from synthesis prompt', () => {
    const generate = vi.fn<MockLLMGenerate>().mockReturnValue(
      Effect.succeed({
        object: basePersona,
      }),
    );

    return Effect.gen(function* () {
      const result = yield* synthesizePersona({
        messages: [
          {
            id: 'u1',
            role: 'user',
            parts: [{ type: 'text', text: 'Create a science communicator.' }],
          },
          {
            id: 'a1',
            role: 'assistant',
            parts: [
              {
                type: 'text',
                text: 'Ready to create [[CREATE_PERSONA]]',
              },
            ],
          },
        ],
      }).pipe(Effect.provide(createMockLLM({ generate })));

      const firstCall = generate.mock.calls[0]?.[0];
      expect(firstCall).toBeDefined();
      if (!firstCall) {
        return;
      }
      expect(firstCall.prompt).not.toContain('[[CREATE_PERSONA]]');
      expect(firstCall.temperature).toBe(0.5);
      expect(result.name).toBe(basePersona.name);
    });
  });

  it.effect('retries synthesis with compact context after LLMError', () =>
    Effect.gen(function* () {
      const generate = vi
        .fn<MockLLMGenerate>()
        .mockReturnValueOnce(
          Effect.fail(
            new LLMError({
              message: 'Failed to generate structured object',
              model: 'mock-model',
            }),
          ),
        )
        .mockReturnValueOnce(
          Effect.succeed({
            object: basePersona,
          }),
        );

      const result = yield* synthesizePersona({
        messages: makeLongConversation(),
      }).pipe(Effect.provide(createMockLLM({ generate })));

      expect(generate).toHaveBeenCalledTimes(2);
      expect(generate.mock.calls[0]?.[0]?.temperature).toBe(0.5);
      expect(generate.mock.calls[1]?.[0]?.temperature).toBe(0.2);
      const firstPrompt = generate.mock.calls[0]?.[0]?.prompt as string;
      const fallbackPrompt = generate.mock.calls[1]?.[0]?.prompt as string;
      expect(fallbackPrompt.length).toBeLessThan(firstPrompt.length);
      expect(result.voiceId).toBe('Puck');
    }),
  );
});
