import {
  createTestUser,
  createTestInfographic,
  resetAllFactories,
} from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Infographic } from '@repo/db/schema';
import { InfographicNotFound } from '../../../errors';
import { createMockInfographicRepo } from '../../../test-utils/mock-infographic-repo';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { getInfographic } from '../get-infographic';

describe('getInfographic', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns infographic when found and owned by user', async () => {
    const user = createTestUser();
    const infographic = createTestInfographic({
      title: 'My Infographic',
      createdBy: user.id,
    });

    const repo = createMockInfographicRepo({
      findById: (id: string) =>
        Effect.suspend(() => {
          if (id === infographic.id) return Effect.succeed(infographic);
          return Effect.fail(new InfographicNotFound({ id }));
        }),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(getInfographic({ id: infographic.id })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result.id).toBe(infographic.id);
    expect(result.title).toBe('My Infographic');
  });

  it('fails with InfographicNotFound when not found', async () => {
    const user = createTestUser();

    const repo = createMockInfographicRepo({
      findById: (id: string) => Effect.fail(new InfographicNotFound({ id })),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(getInfographic({ id: 'infg_nonexistent' })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error).toBeInstanceOf(InfographicNotFound);
    }
  });

  it('fails with ForbiddenError when owned by another user', async () => {
    const user = createTestUser();
    const otherUser = createTestUser();
    const infographic = createTestInfographic({
      createdBy: otherUser.id,
    });

    const repo = createMockInfographicRepo({
      findById: () => Effect.succeed(infographic),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(getInfographic({ id: infographic.id })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result._tag).toBe('Failure');
  });
});
