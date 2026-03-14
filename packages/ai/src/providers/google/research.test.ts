import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersistAIUsageInput } from '../../usage/types';
import { DeepResearch } from '../../research/service';
import { AIUsageRecorder } from '../../usage/recorder';
import { withAIUsageScope } from '../../usage/scope';
import { PROVIDER_TIMEOUTS_MS } from '../timeouts';
import { GoogleDeepResearchLive } from './research';

const mockCreateInteraction = vi.hoisted(() => vi.fn());
const mockGetInteraction = vi.hoisted(() => vi.fn());

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    readonly interactions = {
      create: mockCreateInteraction,
      get: mockGetInteraction,
    };
  },
}));

const runStartResearch = (query: string) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const research = yield* DeepResearch;
      return yield* research.startResearch(query);
    }).pipe(Effect.provide(GoogleDeepResearchLive({ apiKey: 'test-key' }))),
  );

const runStartResearchExit = (query: string) =>
  Effect.runPromiseExit(
    Effect.gen(function* () {
      const research = yield* DeepResearch;
      return yield* research.startResearch(query);
    }).pipe(Effect.provide(GoogleDeepResearchLive({ apiKey: 'test-key' }))),
  );

const runGetResult = (interactionId: string) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const research = yield* DeepResearch;
      return yield* research.getResult(interactionId);
    }).pipe(Effect.provide(GoogleDeepResearchLive({ apiKey: 'test-key' }))),
  );

const runGetResultExit = (interactionId: string) =>
  Effect.runPromiseExit(
    Effect.gen(function* () {
      const research = yield* DeepResearch;
      return yield* research.getResult(interactionId);
    }).pipe(Effect.provide(GoogleDeepResearchLive({ apiKey: 'test-key' }))),
  );

describe('GoogleDeepResearchLive', () => {
  beforeEach(() => {
    mockCreateInteraction.mockReset();
    mockGetInteraction.mockReset();
  });

  it('retries startResearch on transient 429 errors and succeeds', async () => {
    mockCreateInteraction
      .mockRejectedValueOnce(
        Object.assign(new Error('HTTP 429'), { status: 429 }),
      )
      .mockResolvedValueOnce({ id: 'interaction-1' });

    const result = await runStartResearch('retry transient');

    expect(result).toEqual({ interactionId: 'interaction-1' });
    expect(mockCreateInteraction).toHaveBeenCalledTimes(2);
    const [, requestOptions] = mockCreateInteraction.mock.calls[0] ?? [];
    expect(requestOptions.timeout).toBe(PROVIDER_TIMEOUTS_MS.deepResearchStart);
    expect(requestOptions.maxRetries).toBe(0);
    expect(requestOptions.signal).toBeDefined();
  });

  it('retries getResult on transient network transport errors', async () => {
    mockGetInteraction
      .mockRejectedValueOnce(
        Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }),
      )
      .mockResolvedValueOnce({ status: 'in_progress' });

    const result = await runGetResult('interaction-2');

    expect(result).toBeNull();
    expect(mockGetInteraction).toHaveBeenCalledTimes(2);
    const [, requestParams, requestOptions] =
      mockGetInteraction.mock.calls[0] ?? [];
    expect(requestParams).toEqual({});
    expect(requestOptions.timeout).toBe(PROVIDER_TIMEOUTS_MS.deepResearchGet);
    expect(requestOptions.maxRetries).toBe(0);
    expect(requestOptions.signal).toBeDefined();
  });

  it('fails fast for non-transient startResearch errors', async () => {
    mockCreateInteraction.mockRejectedValueOnce(
      Object.assign(new Error('HTTP 400 Bad Request'), { status: 400 }),
    );

    const exit = await runStartResearchExit('non-transient');
    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure') {
      expect(exit.cause._tag).toBe('Fail');
      if (exit.cause._tag === 'Fail') {
        expect(exit.cause.error._tag).toBe('ResearchError');
      }
    }
    expect(mockCreateInteraction).toHaveBeenCalledTimes(1);
  });

  it('stops retrying getResult after max transient attempts', async () => {
    mockGetInteraction.mockRejectedValue(
      Object.assign(new Error('HTTP 503 Service Unavailable'), {
        statusCode: 503,
      }),
    );

    const exit = await runGetResultExit('interaction-3');
    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure') {
      expect(exit.cause._tag).toBe('Fail');
      if (exit.cause._tag === 'Fail') {
        expect(exit.cause.error._tag).toBe('ResearchError');
      }
    }
    expect(mockGetInteraction).toHaveBeenCalledTimes(3);
  });

  it('maps timeout failures to typed ResearchError', async () => {
    mockCreateInteraction.mockRejectedValue(
      new DOMException(
        'The operation was aborted due to timeout',
        'TimeoutError',
      ),
    );

    const exit = await runStartResearchExit('timeout');
    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure') {
      expect(exit.cause._tag).toBe('Fail');
      if (exit.cause._tag === 'Fail') {
        expect(exit.cause.error._tag).toBe('ResearchError');
      }
    }
    expect(mockCreateInteraction).toHaveBeenCalledTimes(3);
  });

  it('records usage when startResearch succeeds', async () => {
    const recorded: PersistAIUsageInput[] = [];
    const recorderLayer = Layer.succeed(AIUsageRecorder, {
      record: (input: PersistAIUsageInput) =>
        Effect.sync(() => {
          recorded.push(input);
        }),
    });

    mockCreateInteraction.mockResolvedValueOnce({ id: 'interaction-usage-1' });

    await Effect.runPromise(
      Effect.gen(function* () {
        const research = yield* DeepResearch;
        return yield* research.startResearch('research prompt');
      }).pipe(
        withAIUsageScope({
          userId: 'user-1',
          requestId: 'req-1',
          operation: 'test.startResearch',
        }),
        Effect.provide(
          Layer.mergeAll(
            GoogleDeepResearchLive({ apiKey: 'test-key' }),
            recorderLayer,
          ),
        ),
      ),
    );

    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      userId: 'user-1',
      requestId: 'req-1',
      scopeOperation: 'test.startResearch',
      modality: 'deep_research',
      provider: 'google',
      providerOperation: 'startResearch',
      status: 'succeeded',
      providerResponseId: 'interaction-usage-1',
      usage: {
        researchRunCount: 1,
        queryChars: 'research prompt'.length,
      },
    });
  });
});
