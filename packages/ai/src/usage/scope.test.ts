import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  annotateAIUsageScope,
  getAIUsageScope,
  inferAIUsageResourceType,
  mergeAIUsageScope,
  withAIUsageScope,
} from './scope';

describe('AI usage scope helpers', () => {
  it('merges scopes without dropping existing values', () => {
    expect(
      mergeAIUsageScope(
        {
          userId: 'user-1',
          operation: 'chat.generate',
          resourceType: 'podcast',
        },
        {
          requestId: 'req-1',
          resourceId: 'podcast-1',
          operation: null,
        },
      ),
    ).toEqual({
      userId: 'user-1',
      requestId: 'req-1',
      jobId: undefined,
      operation: 'chat.generate',
      resourceType: 'podcast',
      resourceId: 'podcast-1',
    });
  });

  it('layers nested scope annotations in FiberRef state', async () => {
    const scope = await Effect.runPromise(
      withAIUsageScope({
        userId: 'user-1',
        operation: 'chat.generate',
      })(
        Effect.gen(function* () {
          yield* annotateAIUsageScope({
            requestId: 'req-1',
            resourceType: 'podcast',
          });
          return yield* withAIUsageScope({
            resourceId: 'podcast-1',
          })(getAIUsageScope);
        }),
      ),
    );

    expect(scope).toEqual({
      userId: 'user-1',
      requestId: 'req-1',
      jobId: undefined,
      operation: 'chat.generate',
      resourceType: 'podcast',
      resourceId: 'podcast-1',
    });
  });

  it('infers resource type from span attributes', () => {
    expect(
      inferAIUsageResourceType({
        'podcast.id': 'podcast-1',
        'user.id': 'user-1',
      }),
    ).toBe('podcast');

    expect(
      inferAIUsageResourceType({
        'resource.id': 'generic-resource',
      }),
    ).toBeUndefined();
  });
});
