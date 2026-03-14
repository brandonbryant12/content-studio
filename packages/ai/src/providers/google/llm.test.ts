import { NoObjectGeneratedError } from 'ai';
import { Effect, Layer, Schema } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersistAIUsageInput } from '../../usage/types';
import { LLM } from '../../llm/service';
import { AIUsageRecorder } from '../../usage/recorder';
import { withAIUsageScope } from '../../usage/scope';
import { GoogleLive } from './llm';

const mockGenerateObject = vi.hoisted(() => vi.fn());
const mockGoogleModel = vi.hoisted(() =>
  vi.fn((modelId: string) => ({ provider: modelId })),
);

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: () => mockGoogleModel,
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
    mockGoogleModel.mockClear();
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
      new DOMException(
        'The operation was aborted due to timeout',
        'TimeoutError',
      ),
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

  it('uses a per-call model override when provided', async () => {
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

    await Effect.runPromise(
      Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'Return an answer',
          schema: TestSchema,
          model: 'gemini-3.1-pro-preview',
        });
      }).pipe(Effect.provide(GoogleLive({ apiKey: 'test-key' }))),
    );

    expect(mockGoogleModel).toHaveBeenCalledWith('gemini-3.1-pro-preview');

    const [callArgs] = mockGenerateObject.mock.calls[0] ?? [];
    expect(callArgs?.model).toEqual({ provider: 'gemini-3.1-pro-preview' });
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

  it('records usage when generation succeeds', async () => {
    const recorded: PersistAIUsageInput[] = [];
    const recorderLayer = Layer.succeed(AIUsageRecorder, {
      record: (input: PersistAIUsageInput) =>
        Effect.sync(() => {
          recorded.push(input);
        }),
    });

    mockGenerateObject.mockResolvedValueOnce({
      object: { answer: 'ok' },
      usage: {
        inputTokens: 11,
        outputTokens: 7,
        totalTokens: 18,
        inputTokenDetails: undefined,
        outputTokenDetails: undefined,
      },
    } as never);

    await Effect.runPromise(
      Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'Return an answer',
          schema: TestSchema,
        });
      }).pipe(
        withAIUsageScope({
          userId: 'user-1',
          requestId: 'req-1',
          operation: 'test.generate',
        }),
        Effect.provide(
          Layer.mergeAll(GoogleLive({ apiKey: 'test-key' }), recorderLayer),
        ),
      ),
    );

    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      userId: 'user-1',
      requestId: 'req-1',
      scopeOperation: 'test.generate',
      modality: 'llm',
      provider: 'google',
      providerOperation: 'generateObject',
      status: 'succeeded',
      usage: {
        inputTokens: 11,
        outputTokens: 7,
        totalTokens: 18,
      },
      estimatedCostUsdMicros: 13,
    });
  });

  it('records the overridden model and pricing when generation succeeds', async () => {
    const recorded: PersistAIUsageInput[] = [];
    const recorderLayer = Layer.succeed(AIUsageRecorder, {
      record: (input: PersistAIUsageInput) =>
        Effect.sync(() => {
          recorded.push(input);
        }),
    });

    mockGenerateObject.mockResolvedValueOnce({
      object: { answer: 'ok' },
      usage: {
        inputTokens: 11,
        outputTokens: 7,
        totalTokens: 18,
        inputTokenDetails: undefined,
        outputTokenDetails: undefined,
      },
    } as never);

    await Effect.runPromise(
      Effect.gen(function* () {
        const llm = yield* LLM;
        return yield* llm.generate({
          prompt: 'Return an answer',
          schema: TestSchema,
          model: 'gemini-3.1-pro-preview',
        });
      }).pipe(
        withAIUsageScope({
          userId: 'user-1',
          requestId: 'req-1',
          operation: 'test.generate',
        }),
        Effect.provide(
          Layer.mergeAll(GoogleLive({ apiKey: 'test-key' }), recorderLayer),
        ),
      ),
    );

    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      model: 'gemini-3.1-pro-preview',
      estimatedCostUsdMicros: 106,
    });
  });
});
