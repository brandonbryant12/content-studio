import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import {
  activityLog as activityLogTable,
  user as userTable,
  type ActivityLogOutput,
} from '@repo/db/schema';
import { ActivityLogRepoLive } from '@repo/media';
import {
  createTestAdmin,
  createTestContext,
  createTestUser,
  resetAllFactories,
  toUser,
  type TestContext,
} from '@repo/testing';
import { Layer } from 'effect';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ServerRuntime } from '../../runtime';
import activityRouter from '../activity';
import {
  createMockContext,
  createMockErrors,
  createTestServerRuntime,
} from './helpers';

type ORPCProcedure = {
  '~orpc': { handler: (args: unknown) => Promise<unknown> };
};

const callHandler = <T>(
  procedure: ORPCProcedure,
  args: { context: unknown; input: unknown; errors: unknown },
): Promise<T> => {
  return procedure['~orpc'].handler(args) as Promise<T>;
};

const expectErrorWithMessage = async (
  promise: Promise<unknown>,
  expectedMessage: string | RegExp,
) => {
  await expect(promise).rejects.toThrow();
  try {
    await promise;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (typeof expectedMessage === 'string') {
      expect(errorMessage).toContain(expectedMessage);
    } else {
      expect(errorMessage).toMatch(expectedMessage);
    }
  }
};

type HandlerArgs = { context: unknown; input: unknown; errors: unknown };

interface ListActivityOutput {
  data: ActivityLogOutput[];
  hasMore: boolean;
  nextCursor?: string;
}

interface ActivityStatsOutput {
  total: number;
  byEntityType: Array<{ field: string; count: number }>;
  byAction: Array<{ field: string; count: number }>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
}

const handlers = {
  list: (args: HandlerArgs): Promise<ListActivityOutput> =>
    callHandler<ListActivityOutput>(
      activityRouter.list as unknown as ORPCProcedure,
      args,
    ),
  stats: (args: HandlerArgs): Promise<ActivityStatsOutput> =>
    callHandler<ActivityStatsOutput>(
      activityRouter.stats as unknown as ORPCProcedure,
      args,
    ),
};

const createTestRuntime = (ctx: TestContext): ServerRuntime => {
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(ctx.dbLayer));
  const activityLogRepoLayer = ActivityLogRepoLive.pipe(
    Layer.provide(ctx.dbLayer),
  );

  return createTestServerRuntime(
    Layer.mergeAll(ctx.dbLayer, policyLayer, activityLogRepoLayer),
  );
};

const insertTestUser = async (
  ctx: TestContext,
  testUser: ReturnType<typeof createTestUser>,
) => {
  await ctx.db.insert(userTable).values({
    id: testUser.id,
    name: testUser.name,
    email: testUser.email,
    emailVerified: true,
    role: testUser.role,
  });
};

interface InsertActivityOptions {
  action?: string;
  entityType?: string;
  entityId?: string | null;
  entityTitle?: string | null;
  createdAt?: Date;
}

const insertActivity = async (
  ctx: TestContext,
  userId: string,
  options: InsertActivityOptions = {},
) => {
  await ctx.db.insert(activityLogTable).values({
    userId,
    action: options.action ?? 'created',
    entityType: options.entityType ?? 'document',
    entityId: options.entityId ?? null,
    entityTitle: options.entityTitle ?? null,
    metadata: null,
    createdAt: options.createdAt ?? new Date(),
  });
};

describe('activity router', () => {
  let ctx: TestContext;
  let runtime: ServerRuntime;
  let adminUser: ReturnType<typeof createTestAdmin>;
  let admin: User;
  const errors = createMockErrors();

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    runtime = createTestRuntime(ctx);
    adminUser = createTestAdmin({ id: 'admin-1', name: 'Admin User' });
    admin = toUser(adminUser);
    await insertTestUser(ctx, adminUser);
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  describe('list handler', () => {
    it('returns FORBIDDEN for non-admin users', async () => {
      const user = createTestUser({ id: 'user-1' });
      await insertTestUser(ctx, user);

      const context = createMockContext(runtime, toUser(user));
      await expectErrorWithMessage(
        handlers.list({
          context,
          input: {},
          errors,
        }),
        /requires admin role/i,
      );
    });

    it('returns paginated serialized activity entries', async () => {
      const member = createTestUser({ id: 'user-2', name: 'Member One' });
      await insertTestUser(ctx, member);

      const newestTime = new Date('2026-02-18T15:00:00.000Z');
      const olderTime = new Date('2026-02-18T13:00:00.000Z');

      await insertActivity(ctx, member.id, {
        action: 'created',
        entityType: 'document',
        entityId: 'doc-1',
        entityTitle: 'Q1 Plan',
        createdAt: olderTime,
      });
      await insertActivity(ctx, member.id, {
        action: 'updated',
        entityType: 'podcast',
        entityId: 'pod-1',
        entityTitle: 'Weekly Roundup',
        createdAt: newestTime,
      });

      const context = createMockContext(runtime, admin);
      const result = await handlers.list({
        context,
        input: { limit: 1 },
        errors,
      });

      expect(result.data).toHaveLength(1);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe(newestTime.toISOString());
      expect(result.data[0]).toMatchObject({
        action: 'updated',
        entityType: 'podcast',
        entityId: 'pod-1',
        entityTitle: 'Weekly Roundup',
        userName: 'Member One',
        createdAt: newestTime.toISOString(),
      });
    });

    it('applies entityType and search filters', async () => {
      const member = createTestUser({ id: 'user-3', name: 'Filter User' });
      await insertTestUser(ctx, member);

      await insertActivity(ctx, member.id, {
        entityType: 'document',
        entityId: 'doc-2',
        entityTitle: 'Engineering Handbook',
      });
      await insertActivity(ctx, member.id, {
        entityType: 'podcast',
        entityId: 'pod-2',
        entityTitle: 'Quarterly Earnings',
      });

      const context = createMockContext(runtime, admin);
      const result = await handlers.list({
        context,
        input: { entityType: 'podcast', search: 'Quarterly', limit: 10 },
        errors,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        entityType: 'podcast',
        entityTitle: 'Quarterly Earnings',
      });
    });
  });

  describe('stats handler', () => {
    it('returns FORBIDDEN for non-admin users', async () => {
      const user = createTestUser({ id: 'user-4' });
      await insertTestUser(ctx, user);

      const context = createMockContext(runtime, toUser(user));
      await expectErrorWithMessage(
        handlers.stats({
          context,
          input: { period: '7d' },
          errors,
        }),
        /requires admin role/i,
      );
    });

    it('returns aggregated counts scoped to the selected period', async () => {
      const alice = createTestUser({ name: 'Alice' });
      const bob = createTestUser({ name: 'Bob' });
      await insertTestUser(ctx, alice);
      await insertTestUser(ctx, bob);

      const context = createMockContext(runtime, admin);
      const before = await handlers.stats({
        context,
        input: { period: '7d' },
        errors,
      });

      const now = Date.now();
      await insertActivity(ctx, alice.id, {
        action: 'created',
        entityType: 'document',
        entityId: 'doc-3',
        createdAt: new Date(now - 2 * 60 * 60 * 1000),
      });
      await insertActivity(ctx, alice.id, {
        action: 'updated',
        entityType: 'podcast',
        entityId: 'pod-3',
        createdAt: new Date(now - 60 * 60 * 1000),
      });
      await insertActivity(ctx, bob.id, {
        action: 'created',
        entityType: 'voiceover',
        entityId: 'vo-1',
        createdAt: new Date(now - 30 * 60 * 1000),
      });
      await insertActivity(ctx, bob.id, {
        action: 'created',
        entityType: 'document',
        entityId: 'doc-4',
        createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
      });

      const result = await handlers.stats({
        context,
        input: { period: '7d' },
        errors,
      });

      const toCountMap = (rows: Array<{ field: string; count: number }>) =>
        new Map(rows.map((row) => [row.field, row.count]));
      const byEntityTypeBefore = toCountMap(before.byEntityType);
      const byEntityTypeAfter = toCountMap(result.byEntityType);
      const byActionBefore = toCountMap(before.byAction);
      const byActionAfter = toCountMap(result.byAction);

      expect(result.total - before.total).toBe(3);
      expect(
        (byEntityTypeAfter.get('document') ?? 0) -
          (byEntityTypeBefore.get('document') ?? 0),
      ).toBe(1);
      expect(
        (byEntityTypeAfter.get('podcast') ?? 0) -
          (byEntityTypeBefore.get('podcast') ?? 0),
      ).toBe(1);
      expect(
        (byEntityTypeAfter.get('voiceover') ?? 0) -
          (byEntityTypeBefore.get('voiceover') ?? 0),
      ).toBe(1);
      expect(
        (byActionAfter.get('created') ?? 0) -
          (byActionBefore.get('created') ?? 0),
      ).toBe(2);
      expect(
        (byActionAfter.get('updated') ?? 0) -
          (byActionBefore.get('updated') ?? 0),
      ).toBe(1);
    });
  });
});
