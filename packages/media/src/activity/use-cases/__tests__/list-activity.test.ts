import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer } from 'effect';
import { listActivity } from '../list-activity';
import { createMockActivityLogRepo, MockDbLive } from '../../../test-utils';
import { createTestUser, createTestAdmin, withTestUser } from '@repo/testing';
import type { ActivityLogWithUser, ActivityLogId } from '@repo/db/schema';

const createMockActivityLog = (
  overrides: Partial<ActivityLogWithUser> = {},
): ActivityLogWithUser => ({
  id: 'act_0000000000000001' as ActivityLogId,
  userId: 'user-1',
  userName: 'Test User',
  action: 'created',
  entityType: 'document',
  entityId: null,
  entityTitle: null,
  metadata: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

describe('listActivity', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('authorization', () => {
    it('succeeds for admin users', async () => {
      const admin = createTestAdmin({ id: 'admin-1' });
      const mockRepo = createMockActivityLogRepo({
        list: () => Effect.succeed([]),
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(admin)(listActivity({}).pipe(Effect.provide(layers))),
      );

      expect(result.data).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('fails for non-admin users', async () => {
      const user = createTestUser({ id: 'user-1' });
      const mockRepo = createMockActivityLogRepo({
        list: () => Effect.succeed([]),
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const exit = await Effect.runPromiseExit(
        withTestUser(user)(listActivity({}).pipe(Effect.provide(layers))),
      );

      expect(exit._tag).toBe('Failure');
    });
  });

  describe('success cases', () => {
    it('returns paginated results', async () => {
      const admin = createTestAdmin({ id: 'admin-1' });
      const activities = [
        createMockActivityLog({ id: 'act_0000000000000001' as ActivityLogId }),
        createMockActivityLog({ id: 'act_0000000000000002' as ActivityLogId }),
      ];

      const mockRepo = createMockActivityLogRepo({
        list: () => Effect.succeed(activities),
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(admin)(
          listActivity({ limit: 25 }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('passes filters to repo', async () => {
      const admin = createTestAdmin({ id: 'admin-1' });
      const listSpy = vi.fn();

      const mockRepo = createMockActivityLogRepo({
        list: (options) => {
          listSpy(options);
          return Effect.succeed([]);
        },
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      await Effect.runPromise(
        withTestUser(admin)(
          listActivity({
            userId: 'user-123',
            entityType: 'podcast',
            action: 'created',
            limit: 10,
            afterCursor: '2025-01-01T00:00:00.000Z',
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          entityType: 'podcast',
          action: 'created',
          limit: 10,
          afterCursor: '2025-01-01T00:00:00.000Z',
        }),
      );
    });

    it('defaults limit to 25', async () => {
      const admin = createTestAdmin({ id: 'admin-1' });
      const listSpy = vi.fn();

      const mockRepo = createMockActivityLogRepo({
        list: (options) => {
          listSpy(options);
          return Effect.succeed([]);
        },
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      await Effect.runPromise(
        withTestUser(admin)(listActivity({}).pipe(Effect.provide(layers))),
      );

      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25 }),
      );
    });
  });
});
