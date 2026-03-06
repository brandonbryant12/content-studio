import { Db } from '@repo/db/effect';
import {
  createTestAdmin,
  createTestUser,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DbUser } from '@repo/db/schema';
import { AdminUserNotFound } from '../../../errors';
import {
  AdminRepo,
  type AdminRepoService,
  type AdminUserEntityRecord,
} from '../../repos/admin-repo';
import { listUserEntities } from '../list-user-entities';

const MockDbLive = Layer.succeed(Db, {
  db: {} as never,
});

const toDbUserRecord = (user: ReturnType<typeof createTestUser>): DbUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: true,
  image: null,
  role: user.role,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
});

const createMockAdminRepo = (
  overrides: Partial<AdminRepoService> = {},
): Layer.Layer<AdminRepo> =>
  Layer.succeed(AdminRepo, {
    searchUsers: () => Effect.die('not implemented'),
    listUserEntities: () => Effect.die('not implemented'),
    countUserEntities: () => Effect.die('not implemented'),
    findUserById: () => Effect.die('not implemented'),
    listUserAIUsageEvents: () => Effect.die('not implemented'),
    getUserAIUsageSummary: () => Effect.die('not implemented'),
    ...overrides,
  });

describe('listUserEntities', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns paginated entities for admins', async () => {
    const admin = createTestAdmin({ id: 'admin-1' });
    const member = toDbUserRecord(createTestUser({ id: 'member-1' }));
    const entities: readonly AdminUserEntityRecord[] = [
      {
        entityType: 'podcast',
        entityId: 'pod_1',
        title: 'Quarterly Podcast',
        subtitle: 'conversation',
        status: 'ready',
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
        updatedAt: new Date('2026-03-05T10:00:00.000Z'),
      },
    ];

    const repo = createMockAdminRepo({
      findUserById: () => Effect.succeed(member),
      listUserEntities: () => Effect.succeed(entities),
      countUserEntities: () => Effect.succeed(3),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(admin)(
        listUserEntities({
          userId: member.id,
          query: 'quarterly',
          limit: 1,
          offset: 0,
        }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result.entities).toEqual(entities);
    expect(result.total).toBe(3);
    expect(result.hasMore).toBe(true);
  });

  it('fails with ForbiddenError for non-admin users', async () => {
    const user = createTestUser({ id: 'member-2' });
    const repo = createMockAdminRepo();
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        listUserEntities({
          userId: 'member-1',
          limit: 12,
          offset: 0,
        }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('ForbiddenError');
    }
  });

  it('fails with AdminUserNotFound when the target user does not exist', async () => {
    const admin = createTestAdmin({ id: 'admin-2' });
    const repo = createMockAdminRepo({
      findUserById: (userId) => Effect.fail(new AdminUserNotFound({ userId })),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      withTestUser(admin)(
        listUserEntities({
          userId: 'missing-user',
          limit: 12,
          offset: 0,
        }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('AdminUserNotFound');
      expect((error as AdminUserNotFound).userId).toBe('missing-user');
    }
  });
});
