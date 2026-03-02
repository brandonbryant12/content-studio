import { NoObjectGeneratedError } from 'ai';
import { Effect, Schema } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LLM } from '../service';
import { GoogleLive } from './google';

const mockGenerateObject = vi.hoisted(() => vi.fn());

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: () => () => ({ provider: 'google-test-model' }),
}));

vi.mock('ai', async () => {
  const actual = (await vi.importActual('ai')) as Record<string, unknown>;
  return {
    ...actual,
    generateObject: mockGenerateObject,
  };
});

const TestSchema = Schema.Struct({ answer: Schema.String });

const runGenerate = () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const llm = yield* LLM;
      return yield* llm.generate({
        prompt: 'Return an answer',
        schema: TestSchema,
      });
    }).pipe(Effect.provide(GoogleLive({ apiKey: 'test-key' }))),
  );

const runGenerateExit = () =>
  Effect.runPromiseExit(
    Effect.gen(function* () {
      const llm = yield* LLM;
      return yield* llm.generate({
        prompt: 'Return an answer',
        schema: TestSchema,
      });
    }).pipe(Effect.provide(GoogleLive({ apiKey: 'test-key' }))),
  );

describe('GoogleLive LLM provider', () => {
  beforeEach(() => {
    mockGenerateObject.mockReset();
  });

  it('retries retryable LLM failures and then succeeds', async () => {
    mockGenerateObject
      .mockRejectedValueOnce(
        Object.assign(new Error('HTTP 503 Service Unavailable'), {
          statusCode: 503,
        }),
      )
      .mockResolvedValueOnce({
        object: { answer: 'ok' },
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
          inputTokenDetails: undefined,
          outputTokenDetails: undefined,
        },
      } as never);

    const result = await runGenerate();

    expect(result.object.answer).toBe('ok');
    expect(mockGenerateObject).toHaveBeenCalledTimes(2);
  });

  it('fails fast for non-retryable LLM failures', async () => {
    mockGenerateObject.mockRejectedValueOnce(
      Object.assign(new Error('HTTP 400 Bad Request'), {
        statusCode: 400,
      }),
    );

    const exit = await runGenerateExit();

    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure') {
      expect(exit.cause._tag).toBe('Fail');
      if (exit.cause._tag === 'Fail') {
        expect(exit.cause.error._tag).toBe('LLMError');
      }
    }
    expect(mockGenerateObject).toHaveBeenCalledTimes(1);
  });

  it('stops retrying after max attempts for retryable failures', async () => {
    mockGenerateObject.mockRejectedValue(
      Object.assign(new Error('HTTP 503 Service Unavailable'), {
        statusCode: 503,
      }),
    );

    const exit = await runGenerateExit();

    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure') {
      expect(exit.cause._tag).toBe('Fail');
      if (exit.cause._tag === 'Fail') {
        expect(exit.cause.error._tag).toBe('LLMError');
      }
    }
    expect(mockGenerateObject).toHaveBeenCalledTimes(3);
  });

  it('maps timeout failures to typed LLMError', async () => {
    mockGenerateObject.mockRejectedValue(
      new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
    );

    const exit = await runGenerateExit();

    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure') {
      expect(exit.cause._tag).toBe('Fail');
      if (exit.cause._tag === 'Fail') {
        expect(exit.cause.error._tag).toBe('LLMError');
      }
    }
    expect(mockGenerateObject).toHaveBeenCalledTimes(3);
  });

  it('passes an explicit per-attempt timeout abort signal to generateObject', async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: { answer: 'ok' },
      usage: {
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        inputTokenDetails: undefined,
        outputTokenDetails: undefined,
      },
    } as never);

    await runGenerate();

    const [callArgs] = mockGenerateObject.mock.calls[0] ?? [];
    expect(callArgs).toBeDefined();
    if (!callArgs) {
      return;
    }
    expect(callArgs.maxRetries).toBe(0);
    expect(callArgs.abortSignal).toBeDefined();
    expect(callArgs.abortSignal.aborted).toBe(false);
  });

  it('retries object-generation parse failures', async () => {
    mockGenerateObject
      .mockRejectedValueOnce(
        new NoObjectGeneratedError({
          message: 'Could not parse generated output',
          text: '{broken-json',
          response: {} as never,
          usage: {} as never,
          finishReason: 'stop',
        }),
      )
      .mockResolvedValueOnce({
        object: { answer: 'ok' },
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
          inputTokenDetails: undefined,
          outputTokenDetails: undefined,
        },
      } as never);

    const result = await runGenerate();

    expect(result.object.answer).toBe('ok');
    expect(mockGenerateObject).toHaveBeenCalledTimes(2);
  });
});
