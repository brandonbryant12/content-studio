import { createMockImageGen } from '@repo/ai/testing';
import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import { user as userTable } from '@repo/db/schema';
import { PersonaRepoLive } from '@repo/media/persona';
import { createInMemoryStorage } from '@repo/storage/testing';
import {
  createTestContext,
  createTestUser,
  resetAllFactories,
  toUser,
  type TestContext,
} from '@repo/testing';
import { Layer } from 'effect';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ServerRuntime } from '../../runtime';
import {
  callORPCHandler,
  createMockContext,
  createMockErrors,
  createTestServerRuntime,
  expectHandlerErrorCode,
} from '../_shared/test-helpers';
import personaRouter from '../persona';

type ORPCProcedure = {
  '~orpc': { handler: (args: unknown) => Promise<unknown> };
};

type HandlerArgs = { context: unknown; input: unknown; errors: unknown };

interface PersonaOutput {
  id: string;
  name: string;
  avatarStorageKey: string | null;
}

const handlers = {
  create: (args: HandlerArgs): Promise<PersonaOutput> =>
    callORPCHandler<PersonaOutput>(
      personaRouter.create as unknown as ORPCProcedure,
      args,
    ),
  get: (args: HandlerArgs): Promise<PersonaOutput> =>
    callORPCHandler<PersonaOutput>(
      personaRouter.get as unknown as ORPCProcedure,
      args,
    ),
  generateAvatar: (args: HandlerArgs): Promise<Record<string, never>> =>
    callORPCHandler<Record<string, never>>(
      personaRouter.generateAvatar as unknown as ORPCProcedure,
      args,
    ),
};

const createTestRuntime = (
  ctx: TestContext,
  imageGenLayer: ReturnType<typeof createMockImageGen> = createMockImageGen(),
): ServerRuntime => {
  const inMemoryStorage = createInMemoryStorage();
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(ctx.dbLayer));

  const allLayers = Layer.mergeAll(
    ctx.dbLayer,
    policyLayer,
    PersonaRepoLive.pipe(Layer.provide(ctx.dbLayer)),
    inMemoryStorage.layer,
    imageGenLayer,
  );

  return createTestServerRuntime(allLayers);
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

describe('persona router', () => {
  let ctx: TestContext;
  let runtime: ServerRuntime;
  let user: User;
  const errors = createMockErrors();

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    const testUser = createTestUser();
    user = toUser(testUser);
    await insertTestUser(ctx, testUser);
    runtime = createTestRuntime(ctx);
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  it('generates an avatar and persists avatarStorageKey', async () => {
    const context = createMockContext(runtime, user);
    const persona = await handlers.create({
      context,
      input: { name: 'Avatar Test Persona' },
      errors,
    });

    const result = await handlers.generateAvatar({
      context,
      input: { id: persona.id },
      errors,
    });

    expect(result).toEqual({});

    const stored = await handlers.get({
      context,
      input: { id: persona.id },
      errors,
    });
    expect(stored.avatarStorageKey).toBe(`personas/${persona.id}/avatar.png`);
  });

  it('fails generateAvatar when image generation fails', async () => {
    const failingRuntime = createTestRuntime(
      ctx,
      createMockImageGen({ shouldRejectContent: true }),
    );
    const context = createMockContext(failingRuntime, user);
    const persona = await handlers.create({
      context,
      input: { name: 'Failing Avatar Persona' },
      errors,
    });

    await expectHandlerErrorCode(
      () =>
        handlers.generateAvatar({
          context,
          input: { id: persona.id },
          errors,
        }),
      'SERVICE_UNAVAILABLE',
    );
  });
});
