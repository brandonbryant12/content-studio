import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import {
  infographic as infographicTable,
  user as userTable,
  type InfographicOutput,
} from '@repo/db/schema';
import { InfographicRepoLive } from '@repo/media/infographic';
import {
  createTestAdmin,
  createTestContext,
  createTestInfographic,
  createTestUser,
  resetAllFactories,
  toUser,
  type TestContext,
} from '@repo/testing';
import { eq } from 'drizzle-orm';
import { Layer } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ServerRuntime } from '../../runtime';
import {
  callORPCHandler,
  createMockContext,
  createMockErrors,
  createTestServerRuntime,
  expectHandlerErrorCode,
} from '../_shared/test-helpers';
import infographicRouter from '../infographic';

type ORPCProcedure = {
  '~orpc': { handler: (args: unknown) => Promise<unknown> };
};

type HandlerArgs = { context: unknown; input: unknown; errors: unknown };

const handlers = {
  approve: (args: HandlerArgs): Promise<InfographicOutput> =>
    callORPCHandler<InfographicOutput>(
      infographicRouter.approve as unknown as ORPCProcedure,
      args,
    ),
  revokeApproval: (args: HandlerArgs): Promise<InfographicOutput> =>
    callORPCHandler<InfographicOutput>(
      infographicRouter.revokeApproval as unknown as ORPCProcedure,
      args,
    ),
};

const createTestRuntime = (ctx: TestContext): ServerRuntime => {
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(ctx.dbLayer));
  const infographicRepoLayer = InfographicRepoLive.pipe(
    Layer.provide(ctx.dbLayer),
  );

  return createTestServerRuntime(
    Layer.mergeAll(ctx.dbLayer, policyLayer, infographicRepoLayer),
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

const insertTestInfographic = async (
  ctx: TestContext,
  userId: string,
  options: Omit<Parameters<typeof createTestInfographic>[0], 'createdBy'> = {},
) => {
  const infographic = createTestInfographic({
    createdBy: userId,
    ...options,
  });
  await ctx.db.insert(infographicTable).values(infographic);
  return infographic;
};

describe('infographic router', () => {
  let ctx: TestContext;
  let runtime: ServerRuntime;
  let memberUser: ReturnType<typeof createTestUser>;
  let member: User;
  let adminUser: ReturnType<typeof createTestAdmin>;
  let admin: User;
  const errors = createMockErrors();

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    runtime = createTestRuntime(ctx);

    memberUser = createTestUser({ id: 'user-1', name: 'Member User' });
    member = toUser(memberUser);
    await insertTestUser(ctx, memberUser);

    adminUser = createTestAdmin({ id: 'admin-1', name: 'Admin User' });
    admin = toUser(adminUser);
    await insertTestUser(ctx, adminUser);
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  it('returns FORBIDDEN for all admin-only handlers when user lacks admin role', async () => {
    const readyInfographic = await insertTestInfographic(ctx, memberUser.id, {
      status: 'ready',
    });
    const approvedInfographic = await insertTestInfographic(
      ctx,
      memberUser.id,
      {
        status: 'ready',
        approvedBy: adminUser.id,
        approvedAt: new Date(),
      },
    );

    const context = createMockContext(runtime, member);
    const calls: Array<() => Promise<unknown>> = [
      () =>
        handlers.approve({
          context,
          input: { id: readyInfographic.id },
          errors,
        }),
      () =>
        handlers.revokeApproval({
          context,
          input: { id: approvedInfographic.id },
          errors,
        }),
    ];

    for (const call of calls) {
      await expectHandlerErrorCode(call, 'FORBIDDEN');
    }

    const [persistedReady] = await ctx.db
      .select()
      .from(infographicTable)
      .where(eq(infographicTable.id, readyInfographic.id));
    expect(persistedReady?.approvedBy).toBeNull();
    expect(persistedReady?.approvedAt).toBeNull();

    const [persistedApproved] = await ctx.db
      .select()
      .from(infographicTable)
      .where(eq(infographicTable.id, approvedInfographic.id));
    expect(persistedApproved?.approvedBy).toBe(adminUser.id);
    expect(persistedApproved?.approvedAt).not.toBeNull();
  });

  describe('approve handler', () => {
    it('allows admins to approve infographics', async () => {
      const infographic = await insertTestInfographic(ctx, memberUser.id, {
        status: 'ready',
      });

      await handlers.approve({
        context: createMockContext(runtime, admin),
        input: { id: infographic.id },
        errors,
      });

      const [persisted] = await ctx.db
        .select()
        .from(infographicTable)
        .where(eq(infographicTable.id, infographic.id));

      expect(persisted?.approvedBy).toBe(adminUser.id);
      expect(persisted?.approvedAt).not.toBeNull();
    });
  });

  describe('revokeApproval handler', () => {
    it('allows admins to revoke infographic approval', async () => {
      const infographic = await insertTestInfographic(ctx, memberUser.id, {
        status: 'ready',
        approvedBy: adminUser.id,
        approvedAt: new Date(),
      });

      await handlers.revokeApproval({
        context: createMockContext(runtime, admin),
        input: { id: infographic.id },
        errors,
      });

      const [persisted] = await ctx.db
        .select()
        .from(infographicTable)
        .where(eq(infographicTable.id, infographic.id));

      expect(persisted?.approvedBy).toBeNull();
      expect(persisted?.approvedAt).toBeNull();
    });
  });
});
