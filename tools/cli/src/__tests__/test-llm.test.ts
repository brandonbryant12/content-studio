import { describe, it, expect } from 'vitest';
import { Effect, Schema } from 'effect';
import { LLM, LLMError } from '@repo/ai';
import { MockLLMLive, createMockLLM } from '@repo/testing/mocks';

describe('test-llm command logic', () => {
  it('calls LLM.generate with a schema and returns structured output', async () => {
    const TestSchema = Schema.Struct({
      greeting: Schema.String,
      fact: Schema.String,
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'Generate a greeting and a fact',
          schema: TestSchema,
        });
      }).pipe(Effect.provide(MockLLMLive)),
    );

    expect(result.object).toBeDefined();
    expect(result.usage).toBeDefined();
    expect(result.usage?.totalTokens).toBe(300);
  });

  it('returns token usage metrics', async () => {
    const SimpleSchema = Schema.Struct({ message: Schema.String });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'test',
          schema: SimpleSchema,
        });
      }).pipe(Effect.provide(MockLLMLive)),
    );

    expect(result.usage?.inputTokens).toBe(100);
    expect(result.usage?.outputTokens).toBe(200);
    expect(result.usage?.totalTokens).toBe(300);
  });

  it('surfaces LLMError when generation fails', async () => {
    const errorLayer = createMockLLM({ errorMessage: 'API key invalid' });
    const SimpleSchema = Schema.Struct({ message: Schema.String });

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'test',
          schema: SimpleSchema,
        });
      }).pipe(Effect.provide(errorLayer)),
    );

    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(LLMError);
    }
  });
});
