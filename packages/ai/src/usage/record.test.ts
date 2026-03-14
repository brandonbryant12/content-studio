import { Layer, Effect, Option } from 'effect';
import { describe, expect, it } from 'vitest';
import type { PersistAIUsageInput } from './types';
import {
  createAsyncAIUsageRecorder,
  getAIUsageErrorTag,
  recordAIUsageIfConfigured,
} from './record';
import { AIUsageRecorder } from './recorder';
import { withAIUsageScope } from './scope';

describe('AI usage recording helpers', () => {
  it('merges scope and normalizes raw usage payloads before persisting', async () => {
    const recorded: PersistAIUsageInput[] = [];

    await Effect.runPromise(
      withAIUsageScope({
        userId: 'user-1',
        operation: 'chat.generate',
        resourceType: 'podcast',
      })(
        recordAIUsageIfConfigured({
          modality: 'llm',
          provider: 'google',
          providerOperation: 'generateObject',
          status: 'succeeded',
          usage: {
            inputTokens: 11,
            outputTokens: 7,
          },
          rawUsage: {
            promptTokenCount: 11,
            nested: {
              kept: true,
              dropped: undefined,
            },
            dropped: undefined,
          },
          scope: {
            requestId: 'req-1',
            resourceId: 'podcast-1',
          },
        }),
      ).pipe(
        Effect.provide(
          Layer.succeed(AIUsageRecorder, {
            record: (input) =>
              Effect.sync(() => {
                recorded.push(input);
              }),
          }),
        ),
      ),
    );

    expect(recorded).toEqual([
      {
        modality: 'llm',
        provider: 'google',
        providerOperation: 'generateObject',
        status: 'succeeded',
        userId: 'user-1',
        requestId: 'req-1',
        jobId: null,
        scopeOperation: 'chat.generate',
        resourceType: 'podcast',
        resourceId: 'podcast-1',
        usage: {
          inputTokens: 11,
          outputTokens: 7,
        },
        metadata: null,
        rawUsage: {
          promptTokenCount: 11,
          nested: {
            kept: true,
          },
        },
      },
    ]);
  });

  it('creates async recorders that no-op when no recorder layer is configured', async () => {
    const recordAsync = createAsyncAIUsageRecorder(Option.none(), {
      userId: 'user-1',
      operation: 'chat.generate',
    });

    expect(() =>
      recordAsync({
        modality: 'llm',
        provider: 'google',
        providerOperation: 'generateObject',
        status: 'succeeded',
      }),
    ).not.toThrow();
  });

  it('extracts tagged error names with sensible fallbacks', () => {
    expect(getAIUsageErrorTag({ _tag: 'LLMError' })).toBe('LLMError');
    expect(getAIUsageErrorTag(new TypeError('boom'))).toBe('TypeError');
    expect(getAIUsageErrorTag('plain failure')).toBe('UnknownError');
  });
});
