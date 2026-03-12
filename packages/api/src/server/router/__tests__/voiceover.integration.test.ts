import { MockLLMLive, MockTTSLive } from '@repo/ai/testing';
import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import {
  user as userTable,
  voiceover as voiceoverTable,
  job as jobTable,
  type JobId,
  type VoiceoverId,
  type VoiceoverOutput,
  type VoiceoverListItemOutput,
} from '@repo/db/schema';
import { ActivityLogRepoLive } from '@repo/media/activity';
import { VoiceoverRepoLive } from '@repo/media/voiceover';
import { QueueLive } from '@repo/queue';
import { createInMemoryStorage } from '@repo/storage/testing';
import {
  createTestContext,
  createTestAdmin,
  createTestUser,
  createTestVoiceover,
  resetAllFactories,
  toUser,
  type TestContext,
} from '@repo/testing';
import { eq } from 'drizzle-orm';
import { Layer } from 'effect';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ServerRuntime } from '../../runtime';
import {
  createMockContext,
  createMockErrors,
  assertORPCError,
  type ErrorCode,
  createTestServerRuntime,
} from '../_shared/test-helpers';
import voiceoverRouter from '../voiceover';

// =============================================================================
// oRPC Handler Utilities
// =============================================================================

/**
 * Access the internal handler from an oRPC ImplementedProcedure.
 *
 * oRPC's `.handler()` method returns an object with a `~orpc` property
 * containing the actual handler function. This utility provides type-safe
 * access for testing purposes.
 */
type ORPCProcedure = {
  '~orpc': { handler: (args: unknown) => Promise<unknown> };
};

const callHandler = <T>(
  procedure: ORPCProcedure,
  args: { context: unknown; input: unknown; errors: unknown },
): Promise<T> => {
  return procedure['~orpc'].handler(args) as Promise<T>;
};

const expectHandlerErrorCode = async (
  operation: () => Promise<unknown>,
  expectedCode: ErrorCode,
) => {
  try {
    await operation();
  } catch (error: unknown) {
    assertORPCError(error, expectedCode);
    return;
  }
  throw new Error(`Expected error '${expectedCode}', but operation resolved`);
};

const expectIsoTimestamp = (value: string) => {
  expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(Number.isNaN(Date.parse(value))).toBe(false);
};

// Handler args type
type HandlerArgs = { context: unknown; input: unknown; errors: unknown };

// Job output type
interface JobOutput {
  id: string;
  type: string;
  status: string;
  result: unknown;
  error: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

// Generate response type
interface GenerateResponse {
  jobId: string;
  status: string;
}

// Typed handler accessors for voiceover router
const handlers = {
  create: (args: HandlerArgs): Promise<VoiceoverOutput> =>
    callHandler<VoiceoverOutput>(
      voiceoverRouter.create as unknown as ORPCProcedure,
      args,
    ),
  list: (args: HandlerArgs): Promise<VoiceoverListItemOutput[]> =>
    callHandler<VoiceoverListItemOutput[]>(
      voiceoverRouter.list as unknown as ORPCProcedure,
      args,
    ),
  get: (args: HandlerArgs): Promise<VoiceoverOutput> =>
    callHandler<VoiceoverOutput>(
      voiceoverRouter.get as unknown as ORPCProcedure,
      args,
    ),
  update: (args: HandlerArgs): Promise<VoiceoverOutput> =>
    callHandler<VoiceoverOutput>(
      voiceoverRouter.update as unknown as ORPCProcedure,
      args,
    ),
  delete: (args: HandlerArgs): Promise<Record<string, never>> =>
    callHandler<Record<string, never>>(
      voiceoverRouter.delete as unknown as ORPCProcedure,
      args,
    ),
  generate: (args: HandlerArgs): Promise<GenerateResponse> =>
    callHandler<GenerateResponse>(
      voiceoverRouter.generate as unknown as ORPCProcedure,
      args,
    ),
  getJob: (args: HandlerArgs): Promise<JobOutput> =>
    callHandler<JobOutput>(
      voiceoverRouter.getJob as unknown as ORPCProcedure,
      args,
    ),
  approve: (args: HandlerArgs): Promise<VoiceoverOutput> =>
    callHandler<VoiceoverOutput>(
      voiceoverRouter.approve as unknown as ORPCProcedure,
      args,
    ),
  revokeApproval: (args: HandlerArgs): Promise<VoiceoverOutput> =>
    callHandler<VoiceoverOutput>(
      voiceoverRouter.revokeApproval as unknown as ORPCProcedure,
      args,
    ),
};

// =============================================================================
// Test Setup
// =============================================================================

/**
 * In-memory storage instance for voiceover audio.
 * Shared across tests and cleared in beforeEach.
 */
let inMemoryStorage: ReturnType<typeof createInMemoryStorage>;

/**
 * Create a minimal test runtime with only the services needed for voiceover operations.
 * Uses in-memory storage from @repo/testing to properly store and retrieve content.
 */
const createTestRuntime = (ctx: TestContext): ServerRuntime => {
  inMemoryStorage = createInMemoryStorage();
  const mockAILayers = Layer.mergeAll(
    MockLLMLive,
    MockTTSLive,
    inMemoryStorage.layer,
  );
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(ctx.dbLayer));
  const voiceoverRepoLayer = VoiceoverRepoLive.pipe(Layer.provide(ctx.dbLayer));
  const activityLogRepoLayer = ActivityLogRepoLive.pipe(
    Layer.provide(ctx.dbLayer),
  );
  const queueLayer = QueueLive.pipe(Layer.provide(ctx.dbLayer));

  const allLayers = Layer.mergeAll(
    ctx.dbLayer,
    mockAILayers,
    policyLayer,
    voiceoverRepoLayer,
    activityLogRepoLayer,
    queueLayer,
  );

  return createTestServerRuntime(allLayers);
};

/**
 * Insert a user into the database for testing.
 * Required because voiceovers have a foreign key to the user table.
 */
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

/**
 * Insert a voiceover into the database for testing.
 */
const insertTestVoiceover = async (
  ctx: TestContext,
  userId: string,
  options: Omit<Parameters<typeof createTestVoiceover>[0], 'createdBy'> = {},
) => {
  const voiceover = createTestVoiceover({
    createdBy: userId,
    ...options,
  });
  await ctx.db.insert(voiceoverTable).values(voiceover);
  return voiceover;
};

// =============================================================================
// Tests
// =============================================================================

describe('voiceover router', () => {
  let ctx: TestContext;
  let runtime: ServerRuntime;
  let testUser: ReturnType<typeof createTestUser>;
  let user: User;
  const errors = createMockErrors();

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    runtime = createTestRuntime(ctx);
    testUser = createTestUser();
    user = toUser(testUser);
    await insertTestUser(ctx, testUser);
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  it('returns UNAUTHORIZED for all protected handlers when user is missing', async () => {
    const draftVoiceover = await insertTestVoiceover(ctx, testUser.id, {
      text: 'Draft text for generation',
      status: 'drafting',
    });
    const readyVoiceover = await insertTestVoiceover(ctx, testUser.id, {
      status: 'ready',
    });
    const approvedVoiceover = await insertTestVoiceover(ctx, testUser.id, {
      status: 'ready',
      approvedBy: testUser.id,
      approvedAt: new Date(),
    });
    const [job] = await ctx.db
      .insert(jobTable)
      .values({
        type: 'generate-voiceover',
        payload: { voiceoverId: draftVoiceover.id, userId: testUser.id },
        createdBy: testUser.id,
        status: 'pending',
      })
      .returning();
    expect(job).toBeDefined();
    if (!job) {
      throw new Error('Expected a job row for unauthorized checks');
    }

    const context = createMockContext(runtime, null);
    const calls: Array<() => Promise<unknown>> = [
      () => handlers.list({ context, input: { limit: 10, offset: 0 }, errors }),
      () =>
        handlers.create({ context, input: { title: 'New voiceover' }, errors }),
      () => handlers.get({ context, input: { id: draftVoiceover.id }, errors }),
      () =>
        handlers.update({
          context,
          input: { id: draftVoiceover.id, title: 'Updated title' },
          errors,
        }),
      () =>
        handlers.delete({ context, input: { id: draftVoiceover.id }, errors }),
      () =>
        handlers.generate({
          context,
          input: { id: draftVoiceover.id },
          errors,
        }),
      () => handlers.getJob({ context, input: { jobId: job.id }, errors }),
      () =>
        handlers.approve({ context, input: { id: readyVoiceover.id }, errors }),
      () =>
        handlers.revokeApproval({
          context,
          input: { id: approvedVoiceover.id },
          errors,
        }),
    ];

    for (const call of calls) {
      await expectHandlerErrorCode(call, 'UNAUTHORIZED');
    }
  });

  describe('list handler', () => {
    it('returns empty array when no voiceovers exist', async () => {
      const context = createMockContext(runtime, user);

      const result = await handlers.list({
        context,
        input: { limit: 10, offset: 0 },
        errors,
      });

      expect(result).toEqual([]);
    });

    it('applies ownership and pagination with serialized timestamps', async () => {
      const context = createMockContext(runtime, user);
      for (let i = 1; i <= 3; i++) {
        await insertTestVoiceover(ctx, testUser.id, {
          title: `Mine ${i}`,
          status: i === 1 ? 'ready' : 'drafting',
          duration: i === 1 ? 180 : null,
        });
      }

      const otherUser = createTestUser();
      await insertTestUser(ctx, otherUser);
      await insertTestVoiceover(ctx, otherUser.id, {
        title: 'Other user voiceover',
      });

      const result = await handlers.list({
        context,
        input: { limit: 2, offset: 1 },
        errors,
      });

      expect(result).toHaveLength(2);
      expect(result.every((entry) => entry.createdBy === testUser.id)).toBe(
        true,
      );
      expect(result.every((entry) => !entry.title.includes('Other user'))).toBe(
        true,
      );
      expect(result[0]).toBeDefined();
      if (!result[0]) {
        throw new Error('Expected at least one listed voiceover');
      }
      expect(result[0].id).toMatch(/^voc_/);
      expectIsoTimestamp(result[0].createdAt);
      expectIsoTimestamp(result[0].updatedAt);
    });
  });

  describe('get handler', () => {
    it('returns owned voiceover with serialized fields', async () => {
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        title: 'Narration',
        text: 'Voiceover text',
        status: 'ready',
        voice: 'Kore',
      });
      const context = createMockContext(runtime, user);

      const result = await handlers.get({
        context,
        input: { id: voiceover.id },
        errors,
      });

      expect(result.id).toBe(voiceover.id);
      expect(result.title).toBe('Narration');
      expect(result.text).toBe('Voiceover text');
      expect(result.status).toBe('ready');
      expect(result.voice).toBe('Kore');
      expectIsoTimestamp(result.createdAt);
      expectIsoTimestamp(result.updatedAt);
    });

    it('keeps admins scoped to themselves by default and allows explicit user scope', async () => {
      const adminUser = createTestAdmin();
      await insertTestUser(ctx, adminUser);
      const adminContext = createMockContext(runtime, toUser(adminUser));

      const otherUser = createTestUser();
      await insertTestUser(ctx, otherUser);
      const otherVoiceover = await insertTestVoiceover(ctx, otherUser.id, {
        title: 'Other user narration',
      });

      await expectHandlerErrorCode(
        () =>
          handlers.get({
            context: adminContext,
            input: { id: otherVoiceover.id },
            errors,
          }),
        'VOICEOVER_NOT_FOUND',
      );

      const scopedResult = await handlers.get({
        context: adminContext,
        input: { id: otherVoiceover.id, userId: otherUser.id },
        errors,
      });

      expect(scopedResult.id).toBe(otherVoiceover.id);
      expect(scopedResult.createdBy).toBe(otherUser.id);
    });

    it('returns VOICEOVER_NOT_FOUND for missing or non-owned resources', async () => {
      const context = createMockContext(runtime, user);
      await expectHandlerErrorCode(
        () =>
          handlers.get({
            context,
            input: { id: 'voc_nonexistent123' as VoiceoverId },
            errors,
          }),
        'VOICEOVER_NOT_FOUND',
      );

      const otherUser = createTestUser();
      await insertTestUser(ctx, otherUser);
      const otherVoiceover = await insertTestVoiceover(ctx, otherUser.id);

      await expectHandlerErrorCode(
        () =>
          handlers.get({
            context,
            input: { id: otherVoiceover.id },
            errors,
          }),
        'VOICEOVER_NOT_FOUND',
      );
    });
  });

  describe('create handler', () => {
    it('creates a voiceover and persists it', async () => {
      const context = createMockContext(runtime, user);

      const result = await handlers.create({
        context,
        input: { title: 'My New Voiceover' },
        errors,
      });

      expect(result.id).toMatch(/^voc_/);
      expect(result.title).toBe('My New Voiceover');
      expect(result.createdBy).toBe(testUser.id);
      expect(result.status).toBe('drafting');
      expectIsoTimestamp(result.createdAt);
      expectIsoTimestamp(result.updatedAt);

      const [persisted] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, result.id as VoiceoverId));
      expect(persisted).toBeDefined();
      expect(persisted?.title).toBe('My New Voiceover');
    });
  });

  describe('update handler', () => {
    it('updates multiple fields and persists to the database', async () => {
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        title: 'Original Title',
        text: 'Original text',
        voice: 'Charon',
      });
      const context = createMockContext(runtime, user);

      const result = await handlers.update({
        context,
        input: {
          id: voiceover.id,
          title: 'Updated Title',
          text: 'Updated text',
          voice: 'Fenrir',
          voiceName: 'Fenrir',
        },
        errors,
      });

      expect(result.title).toBe('Updated Title');
      expect(result.text).toBe('Updated text');
      expect(result.voice).toBe('Fenrir');
      expect(result.voiceName).toBe('Fenrir');
      expectIsoTimestamp(result.createdAt);
      expectIsoTimestamp(result.updatedAt);

      const [persisted] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, voiceover.id));
      expect(persisted?.title).toBe('Updated Title');
      expect(persisted?.text).toBe('Updated text');
    });

    it('returns VOICEOVER_NOT_FOUND for missing or non-owned resources', async () => {
      const context = createMockContext(runtime, user);
      await expectHandlerErrorCode(
        () =>
          handlers.update({
            context,
            input: {
              id: 'voc_00000000000000' as VoiceoverId,
              title: 'Missing',
            },
            errors,
          }),
        'VOICEOVER_NOT_FOUND',
      );

      const otherUser = createTestUser();
      await insertTestUser(ctx, otherUser);
      const otherVoiceover = await insertTestVoiceover(ctx, otherUser.id);
      await expectHandlerErrorCode(
        () =>
          handlers.update({
            context,
            input: {
              id: otherVoiceover.id,
              title: 'No access',
            },
            errors,
          }),
        'VOICEOVER_NOT_FOUND',
      );
    });
  });

  describe('delete handler', () => {
    it('deletes a voiceover and fails when deleting it again', async () => {
      const voiceover = await insertTestVoiceover(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      const deleted = await handlers.delete({
        context,
        input: { id: voiceover.id },
        errors,
      });
      expect(deleted).toEqual({});

      const [afterDelete] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, voiceover.id));
      expect(afterDelete).toBeUndefined();

      await expectHandlerErrorCode(
        () =>
          handlers.delete({
            context,
            input: { id: voiceover.id },
            errors,
          }),
        'VOICEOVER_NOT_FOUND',
      );
    });

    it('returns VOICEOVER_NOT_FOUND for non-owned voiceovers', async () => {
      const otherUser = createTestUser();
      await insertTestUser(ctx, otherUser);
      const otherVoiceover = await insertTestVoiceover(ctx, otherUser.id);
      const context = createMockContext(runtime, user);

      await expectHandlerErrorCode(
        () =>
          handlers.delete({
            context,
            input: { id: otherVoiceover.id },
            errors,
          }),
        'VOICEOVER_NOT_FOUND',
      );
    });
  });

  describe('generate handler', () => {
    it('creates a generation job for a draft voiceover', async () => {
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        text: 'Some text to generate audio for',
        status: 'drafting',
      });
      const context = createMockContext(runtime, user);

      const result = await handlers.generate({
        context,
        input: { id: voiceover.id },
        errors,
      });

      expect(result.jobId).toMatch(/^job_/);
      expect(result.status).toBe('pending');

      const [persistedJob] = await ctx.db
        .select()
        .from(jobTable)
        .where(eq(jobTable.id, result.jobId as JobId));
      expect(persistedJob).toBeDefined();
      expect(persistedJob?.type).toBe('generate-voiceover');
    });

    it('returns existing pending job for idempotency', async () => {
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        text: 'Some text to generate',
        status: 'drafting',
      });
      const [existingJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-voiceover',
          payload: { voiceoverId: voiceover.id, userId: testUser.id },
          createdBy: testUser.id,
          status: 'pending',
        })
        .returning();
      expect(existingJob).toBeDefined();
      if (!existingJob) {
        throw new Error('Expected pending job fixture');
      }

      const context = createMockContext(runtime, user);
      const result = await handlers.generate({
        context,
        input: { id: voiceover.id },
        errors,
      });

      expect(result.jobId).toBe(existingJob.id);
      expect(result.status).toBe('pending');
    });

    it('returns VOICEOVER_NOT_FOUND for missing or non-owned resources', async () => {
      const context = createMockContext(runtime, user);
      await expectHandlerErrorCode(
        () =>
          handlers.generate({
            context,
            input: { id: 'voc_nonexistent123' as VoiceoverId },
            errors,
          }),
        'VOICEOVER_NOT_FOUND',
      );

      const otherUser = createTestUser();
      await insertTestUser(ctx, otherUser);
      const otherVoiceover = await insertTestVoiceover(ctx, otherUser.id, {
        text: 'Other user text',
        status: 'drafting',
      });

      await expectHandlerErrorCode(
        () =>
          handlers.generate({
            context,
            input: { id: otherVoiceover.id },
            errors,
          }),
        'VOICEOVER_NOT_FOUND',
      );
    });
  });

  describe('getJob handler', () => {
    it('returns completed jobs in serialized format', async () => {
      const voiceover = await insertTestVoiceover(ctx, testUser.id);
      const [createdJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-voiceover',
          payload: { voiceoverId: voiceover.id, userId: testUser.id },
          createdBy: testUser.id,
          status: 'completed',
          result: {
            voiceoverId: voiceover.id,
            audioUrl: 'https://example.com/audio.wav',
            duration: 120,
          },
          startedAt: new Date(),
          completedAt: new Date(),
        })
        .returning();
      expect(createdJob).toBeDefined();
      if (!createdJob) {
        throw new Error('Expected created completed job');
      }

      const context = createMockContext(runtime, user);
      const result = await handlers.getJob({
        context,
        input: { jobId: createdJob.id },
        errors,
      });

      expect(result.id).toBe(createdJob.id);
      expect(result.type).toBe('generate-voiceover');
      expect(result.status).toBe('completed');
      expect(result.result).toEqual({
        voiceoverId: voiceover.id,
        audioUrl: 'https://example.com/audio.wav',
        duration: 120,
      });
      expectIsoTimestamp(result.createdAt);
      expectIsoTimestamp(result.updatedAt);
      expectIsoTimestamp(result.startedAt!);
      expectIsoTimestamp(result.completedAt!);
    });

    it('returns pending jobs with null optional fields', async () => {
      const voiceover = await insertTestVoiceover(ctx, testUser.id);
      const [createdJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-voiceover',
          payload: { voiceoverId: voiceover.id, userId: testUser.id },
          createdBy: testUser.id,
          status: 'pending',
        })
        .returning();
      expect(createdJob).toBeDefined();
      if (!createdJob) {
        throw new Error('Expected created pending job');
      }

      const context = createMockContext(runtime, user);
      const result = await handlers.getJob({
        context,
        input: { jobId: createdJob.id },
        errors,
      });

      expect(result.status).toBe('pending');
      expect(result.startedAt).toBeNull();
      expect(result.completedAt).toBeNull();
      expect(result.result).toBeNull();
      expect(result.error).toBeNull();
      expectIsoTimestamp(result.createdAt);
      expectIsoTimestamp(result.updatedAt);
    });

    it('returns JOB_NOT_FOUND when job does not exist', async () => {
      const context = createMockContext(runtime, user);
      await expectHandlerErrorCode(
        () =>
          handlers.getJob({
            context,
            input: { jobId: 'job_nonexistent123' },
            errors,
          }),
        'JOB_NOT_FOUND',
      );
    });
  });

  describe('approve handler', () => {
    it('enforces admin role before approving', async () => {
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        status: 'ready',
      });
      const userContext = createMockContext(runtime, user);
      await expectHandlerErrorCode(
        () =>
          handlers.approve({
            context: userContext,
            input: { id: voiceover.id },
            errors,
          }),
        'FORBIDDEN',
      );

      const adminTestUser = createTestUser({ role: 'admin' });
      await insertTestUser(ctx, adminTestUser);
      const adminContext = createMockContext(runtime, toUser(adminTestUser));
      await handlers.approve({
        context: adminContext,
        input: { id: voiceover.id },
        errors,
      });

      const [persisted] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, voiceover.id));
      expect(persisted?.approvedBy).toBe(adminTestUser.id);
      expect(persisted?.approvedAt).not.toBeNull();
    });
  });

  describe('revokeApproval handler', () => {
    it('enforces admin role before revoking', async () => {
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        status: 'ready',
        approvedBy: testUser.id,
        approvedAt: new Date(),
      });
      const userContext = createMockContext(runtime, user);
      await expectHandlerErrorCode(
        () =>
          handlers.revokeApproval({
            context: userContext,
            input: { id: voiceover.id },
            errors,
          }),
        'FORBIDDEN',
      );

      const adminTestUser = createTestUser({ role: 'admin' });
      await insertTestUser(ctx, adminTestUser);
      const adminContext = createMockContext(runtime, toUser(adminTestUser));
      await handlers.revokeApproval({
        context: adminContext,
        input: { id: voiceover.id },
        errors,
      });

      const [persisted] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, voiceover.id));
      expect(persisted?.approvedBy).toBeNull();
      expect(persisted?.approvedAt).toBeNull();
    });
  });
});
