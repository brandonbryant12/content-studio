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
import { AdminRepo, type AdminRepoService } from '../../repos/admin-repo';
import { searchUsers } from '../search-users';

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

describe('searchUsers', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns matching users for admins', async () => {
    const admin = createTestAdmin({ id: 'admin-1' });
    const users = [
      toDbUserRecord(
        createTestUser({
          id: 'member-1',
          name: 'Alice Example',
          email: 'alice@example.com',
        }),
      ),
    ];
    const repo = createMockAdminRepo({
      searchUsers: () => Effect.succeed(users),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(admin)(
        searchUsers({ query: 'alice', limit: 10 }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result.users).toEqual(users);
  });

  it('fails with ForbiddenError for non-admin users', async () => {
    const user = createTestUser({ id: 'member-2' });
    const repo = createMockAdminRepo();
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        searchUsers({ query: 'alice' }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('ForbiddenError');
    }
  });
});
