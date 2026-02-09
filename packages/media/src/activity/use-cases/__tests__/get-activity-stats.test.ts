import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer } from 'effect';
import { getActivityStats } from '../get-activity-stats';
import { createMockActivityLogRepo, MockDbLive } from '../../../test-utils';
import { createTestUser, createTestAdmin, withTestUser } from '@repo/testing';

describe('getActivityStats', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('authorization', () => {
    it('succeeds for admin users', async () => {
      const admin = createTestAdmin({ id: 'admin-1' });

      const mockRepo = createMockActivityLogRepo({
        countTotal: () => Effect.succeed(42),
        countByEntityType: () =>
          Effect.succeed([
            { field: 'document', count: 20 },
            { field: 'podcast', count: 22 },
          ]),
        countByAction: () => Effect.succeed([{ field: 'created', count: 42 }]),
        countByUser: () =>
          Effect.succeed([{ userId: 'user-1', userName: 'Alice', count: 30 }]),
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(admin)(
          getActivityStats({ period: '7d' }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.total).toBe(42);
      expect(result.byEntityType).toEqual([
        { field: 'document', count: 20 },
        { field: 'podcast', count: 22 },
      ]);
      expect(result.byAction).toEqual([{ field: 'created', count: 42 }]);
      expect(result.topUsers).toEqual([
        { userId: 'user-1', userName: 'Alice', count: 30 },
      ]);
    });

    it('fails for non-admin users', async () => {
      const user = createTestUser({ id: 'user-1' });

      const mockRepo = createMockActivityLogRepo({
        countTotal: () => Effect.succeed(0),
        countByEntityType: () => Effect.succeed([]),
        countByAction: () => Effect.succeed([]),
        countByUser: () => Effect.succeed([]),
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const exit = await Effect.runPromiseExit(
        withTestUser(user)(
          getActivityStats({ period: '7d' }).pipe(Effect.provide(layers)),
        ),
      );

      expect(exit._tag).toBe('Failure');
    });
  });

  describe('period handling', () => {
    it('passes since date for 24h period', async () => {
      const admin = createTestAdmin({ id: 'admin-1' });
      const countTotalSpy = vi.fn();

      const mockRepo = createMockActivityLogRepo({
        countTotal: (since) => {
          countTotalSpy(since);
          return Effect.succeed(0);
        },
        countByEntityType: () => Effect.succeed([]),
        countByAction: () => Effect.succeed([]),
        countByUser: () => Effect.succeed([]),
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const before = new Date();
      await Effect.runPromise(
        withTestUser(admin)(
          getActivityStats({ period: '24h' }).pipe(Effect.provide(layers)),
        ),
      );

      const sinceArg = countTotalSpy.mock.calls[0]?.[0] as Date;
      // Should be approximately 24 hours ago
      const diffHours =
        (before.getTime() - sinceArg.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeCloseTo(24, 0);
    });

    it('passes since date for 30d period', async () => {
      const admin = createTestAdmin({ id: 'admin-1' });
      const countTotalSpy = vi.fn();

      const mockRepo = createMockActivityLogRepo({
        countTotal: (since) => {
          countTotalSpy(since);
          return Effect.succeed(0);
        },
        countByEntityType: () => Effect.succeed([]),
        countByAction: () => Effect.succeed([]),
        countByUser: () => Effect.succeed([]),
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const before = new Date();
      await Effect.runPromise(
        withTestUser(admin)(
          getActivityStats({ period: '30d' }).pipe(Effect.provide(layers)),
        ),
      );

      const sinceArg = countTotalSpy.mock.calls[0]?.[0] as Date;
      const diffDays =
        (before.getTime() - sinceArg.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(30, 0);
    });
  });
});
