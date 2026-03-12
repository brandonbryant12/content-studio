import {
  createTestAdmin,
  createTestUser,
  createTestInfographic,
  resetAllFactories,
} from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
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
      expect(error?._tag).toBe('InfographicNotFound');
    }
  });

  it('fails with InfographicNotFound when owned by another user', async () => {
    const user = createTestUser();
    const otherUser = createTestUser();
    const infographic = createTestInfographic({
      createdBy: otherUser.id,
    });

    const repo = createMockInfographicRepo({
      findByIdForUser: (id: string) =>
        Effect.fail(new InfographicNotFound({ id })),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(getInfographic({ id: infographic.id })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('InfographicNotFound');
      expect((error as InfographicNotFound).id).toBe(infographic.id);
    }
  });

  it('fails when admin has no explicit target for another user infographic', async () => {
    const admin = createTestAdmin({ id: 'admin-1' });
    const infographic = createTestInfographic({
      title: 'Admin Visible Infographic',
      createdBy: 'member-1',
    });

    const repo = createMockInfographicRepo({
      findByIdForUser: (id: string) =>
        Effect.fail(new InfographicNotFound({ id })),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      withTestUser(admin)(getInfographic({ id: infographic.id })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('InfographicNotFound');
    }
  });

  it('allows admins to access another user infographic when userId is provided', async () => {
    const admin = createTestAdmin({ id: 'admin-1' });
    const infographic = createTestInfographic({
      title: 'Admin Visible Infographic',
      createdBy: 'member-1',
    });

    const repo = createMockInfographicRepo({
      findByIdForUser: (id: string, userId: string) =>
        Effect.suspend(() => {
          if (id === infographic.id && userId === infographic.createdBy) {
            return Effect.succeed(infographic);
          }
          return Effect.fail(new InfographicNotFound({ id }));
        }),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(admin)(
        getInfographic({
          id: infographic.id,
          userId: infographic.createdBy,
        }),
      ).pipe(Effect.provide(layers)),
    );

    expect(result.id).toBe(infographic.id);
    expect(result.createdBy).toBe(infographic.createdBy);
  });
});
