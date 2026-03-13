import { MockLLMLive, MockTTSLive, createMockLLM } from '@repo/ai/testing';
import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import {
  user as userTable,
  source as sourceTable,
  podcast as podcastTable,
  job as jobTable,
  type PodcastFullOutput,
  type PodcastListItemOutput,
  type PodcastOutput,
  type PodcastId,
  type JobId,
} from '@repo/db/schema';
import { ActivityLogRepoLive } from '@repo/media/activity';
import { PodcastRepoLive } from '@repo/media/podcast';
import { SourceRepoLive } from '@repo/media/source';
import { QueueLive } from '@repo/queue';
import { createInMemoryStorage } from '@repo/storage/testing';
import {
  createTestContext,
  createTestAdmin,
  createTestUser,
  createTestSource,
  createTestPodcast,
  resetAllFactories,
  toUser,
  DEFAULT_TEST_SEGMENTS,
  type TestContext,
} from '@repo/testing';
import { eq } from 'drizzle-orm';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ServerRuntime } from '../../runtime';
import {
  createMockContext,
  createMockErrors,
  assertORPCError,
  type ErrorCode,
  createTestServerRuntime,
} from '../_shared/test-helpers';
import podcastRouter from '../podcast';

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

// Typed handler accessors for podcast router
const handlers = {
  create: (args: HandlerArgs): Promise<PodcastFullOutput> =>
    callHandler<PodcastFullOutput>(
      podcastRouter.create as unknown as ORPCProcedure,
      args,
    ),
  list: (args: HandlerArgs): Promise<PodcastListItemOutput[]> =>
    callHandler<PodcastListItemOutput[]>(
      podcastRouter.list as unknown as ORPCProcedure,
      args,
    ),
  get: (args: HandlerArgs): Promise<PodcastFullOutput> =>
    callHandler<PodcastFullOutput>(
      podcastRouter.get as unknown as ORPCProcedure,
      args,
    ),
  update: (args: HandlerArgs): Promise<PodcastOutput> =>
    callHandler<PodcastOutput>(
      podcastRouter.update as unknown as ORPCProcedure,
      args,
    ),
  delete: (args: HandlerArgs): Promise<Record<string, never>> =>
    callHandler<Record<string, never>>(
      podcastRouter.delete as unknown as ORPCProcedure,
      args,
    ),
  generate: (args: HandlerArgs): Promise<GenerateResponse> =>
    callHandler<GenerateResponse>(
      podcastRouter.generate as unknown as ORPCProcedure,
      args,
    ),
  generatePlan: (args: HandlerArgs): Promise<PodcastOutput> =>
    callHandler<PodcastOutput>(
      podcastRouter.generatePlan as unknown as ORPCProcedure,
      args,
    ),
  getJob: (args: HandlerArgs): Promise<JobOutput> =>
    callHandler<JobOutput>(
      podcastRouter.getJob as unknown as ORPCProcedure,
      args,
    ),
  saveChanges: (args: HandlerArgs): Promise<GenerateResponse> =>
    callHandler<GenerateResponse>(
      podcastRouter.saveChanges as unknown as ORPCProcedure,
      args,
    ),
  approve: (args: HandlerArgs): Promise<PodcastOutput> =>
    callHandler<PodcastOutput>(
      podcastRouter.approve as unknown as ORPCProcedure,
      args,
    ),
  revokeApproval: (args: HandlerArgs): Promise<PodcastOutput> =>
    callHandler<PodcastOutput>(
      podcastRouter.revokeApproval as unknown as ORPCProcedure,
      args,
    ),
};

// =============================================================================
// Test Setup
// =============================================================================

/**
 * In-memory storage instance for podcast audio.
 * Shared across tests and cleared in beforeEach.
 */
let inMemoryStorage: ReturnType<typeof createInMemoryStorage>;

/**
 * Create a minimal test runtime with only the services needed for podcast operations.
 * Uses in-memory storage from @repo/testing to properly store and retrieve content.
 */
const createTestRuntime = (
  ctx: TestContext,
  llmLayer = MockLLMLive,
): ServerRuntime => {
  inMemoryStorage = createInMemoryStorage();
  const mockAILayers = Layer.mergeAll(
    llmLayer,
    MockTTSLive,
    inMemoryStorage.layer,
  );
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(ctx.dbLayer));
  const sourceRepoLayer = SourceRepoLive.pipe(Layer.provide(ctx.dbLayer));
  const podcastRepoLayer = PodcastRepoLive.pipe(Layer.provide(ctx.dbLayer));
  const activityLogRepoLayer = ActivityLogRepoLive.pipe(
    Layer.provide(ctx.dbLayer),
  );
  const queueLayer = QueueLive.pipe(Layer.provide(ctx.dbLayer));

  const allLayers = Layer.mergeAll(
    ctx.dbLayer,
    mockAILayers,
    policyLayer,
    sourceRepoLayer,
    podcastRepoLayer,
    activityLogRepoLayer,
    queueLayer,
  );

  return createTestServerRuntime(allLayers);
};

/**
 * Insert a user into the database for testing.
 * Required because podcasts have a foreign key to the user table.
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
 * Insert a source into the database for testing.
 * Required for creating podcasts with linked sources.
 */
const insertTestSource = async (
  ctx: TestContext,
  userId: string,
  options: Partial<Parameters<typeof createTestSource>[0]> = {},
) => {
  const doc = createTestSource({
    createdBy: userId,
    ...options,
  });
  await ctx.db.insert(sourceTable).values(doc);
  return doc;
};

/**
 * Insert a podcast into the database for testing.
 */
const insertTestPodcast = async (
  ctx: TestContext,
  userId: string,
  options: Parameters<typeof createTestPodcast>[0] = {},
) => {
  const podcast = createTestPodcast({
    createdBy: userId,
    ...options,
  });
  await ctx.db.insert(podcastTable).values(podcast);
  return podcast;
};

// =============================================================================
// Tests
// =============================================================================

describe('podcast router', () => {
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
    const basePodcast = await insertTestPodcast(ctx, testUser.id);
    const readyPodcast = await insertTestPodcast(ctx, testUser.id, {
      status: 'ready',
      segments: DEFAULT_TEST_SEGMENTS,
    });
    const approvedPodcast = await insertTestPodcast(ctx, testUser.id, {
      status: 'ready',
      segments: DEFAULT_TEST_SEGMENTS,
      approvedBy: testUser.id,
      approvedAt: new Date(),
    });
    const [job] = await ctx.db
      .insert(jobTable)
      .values({
        type: 'generate-podcast',
        payload: { podcastId: basePodcast.id, userId: testUser.id },
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
        handlers.create({
          context,
          input: {
            title: 'Unauthorized create',
            format: 'conversation' as const,
          },
          errors,
        }),
      () => handlers.get({ context, input: { id: basePodcast.id }, errors }),
      () =>
        handlers.update({
          context,
          input: { id: basePodcast.id, title: 'Unauthorized update' },
          errors,
        }),
      () =>
        handlers.generate({ context, input: { id: basePodcast.id }, errors }),
      () => handlers.getJob({ context, input: { jobId: job.id }, errors }),
      () =>
        handlers.saveChanges({
          context,
          input: {
            id: readyPodcast.id,
            segments: [{ speaker: 'host', line: 'No auth', index: 0 }],
          },
          errors,
        }),
      () =>
        handlers.approve({ context, input: { id: readyPodcast.id }, errors }),
      () =>
        handlers.revokeApproval({
          context,
          input: { id: approvedPodcast.id },
          errors,
        }),
      () => handlers.delete({ context, input: { id: basePodcast.id }, errors }),
    ];

    for (const call of calls) {
      await expectHandlerErrorCode(call, 'UNAUTHORIZED');
    }
  });

  describe('list handler', () => {
    it('returns empty array when no podcasts exist', async () => {
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
        await insertTestPodcast(ctx, testUser.id, { title: `Mine ${i}` });
      }
      const otherUser = createTestUser();
      await insertTestUser(ctx, otherUser);
      await insertTestPodcast(ctx, otherUser.id, {
        title: 'Other user podcast',
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
        throw new Error('Expected at least one listed podcast');
      }
      expect(result[0].id).toMatch(/^pod_/);
      expectIsoTimestamp(result[0].createdAt);
      expectIsoTimestamp(result[0].updatedAt);
    });
  });

  describe('get handler', () => {
    it('returns owned podcast with sources, segments, and serialized fields', async () => {
      const doc = await insertTestSource(ctx, testUser.id, {
        title: 'Source Doc',
      });
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        title: 'Full Format Test',
        sourceIds: [doc.id],
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
      });
      const context = createMockContext(runtime, user);

      const result = await handlers.get({
        context,
        input: { id: podcast.id },
        errors,
      });

      expect(result.id).toBe(podcast.id);
      expect(result.title).toBe('Full Format Test');
      expect(result.status).toBe('ready');
      expect(result.segments).toEqual(DEFAULT_TEST_SEGMENTS);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]?.id).toBe(doc.id);
      expect(result.sources[0]?.title).toBe('Source Doc');
      expectIsoTimestamp(result.createdAt);
      expectIsoTimestamp(result.updatedAt);
    });

    it('keeps admins scoped to themselves by default and allows explicit user scope', async () => {
      const adminUser = createTestAdmin();
      await insertTestUser(ctx, adminUser);
      const adminContext = createMockContext(runtime, toUser(adminUser));

      const otherUser = createTestUser();
      await insertTestUser(ctx, otherUser);
      const otherPodcast = await insertTestPodcast(ctx, otherUser.id, {
        title: 'Other user podcast',
      });

      await expectHandlerErrorCode(
        () =>
          handlers.get({
            context: adminContext,
            input: { id: otherPodcast.id },
            errors,
          }),
        'PODCAST_NOT_FOUND',
      );

      const scopedResult = await handlers.get({
        context: adminContext,
        input: { id: otherPodcast.id, userId: otherUser.id },
        errors,
      });

      expect(scopedResult.id).toBe(otherPodcast.id);
      expect(scopedResult.createdBy).toBe(otherUser.id);
    });

    it('returns PODCAST_NOT_FOUND for missing or non-owned resources', async () => {
      const context = createMockContext(runtime, user);
      await expectHandlerErrorCode(
        () =>
          handlers.get({
            context,
            input: { id: 'pod_nonexistent123' as PodcastId },
            errors,
          }),
        'PODCAST_NOT_FOUND',
      );

      const otherUser = createTestUser();
      await insertTestUser(ctx, otherUser);
      const otherPodcast = await insertTestPodcast(ctx, otherUser.id);
      await expectHandlerErrorCode(
        () =>
          handlers.get({
            context,
            input: { id: otherPodcast.id },
            errors,
          }),
        'PODCAST_NOT_FOUND',
      );
    });
  });

  describe('create handler', () => {
    it('creates and persists a podcast with metadata and sources', async () => {
      const context = createMockContext(runtime, user);
      const doc = await insertTestSource(ctx, testUser.id, {
        title: 'Source Doc',
      });

      const result = await handlers.create({
        context,
        input: {
          title: 'Podcast with Metadata',
          format: 'conversation' as const,
          sourceIds: [doc.id],
          description: 'A test podcast description',
          setupInstructions: 'Lead with the bill breakdown',
          promptInstructions: 'Make it funny',
          targetDurationMinutes: 10,
          hostVoice: 'Charon',
          hostVoiceName: 'Charon',
          coHostVoice: 'Kore',
          coHostVoiceName: 'Kore',
        },
        errors,
      });

      expect(result.id).toMatch(/^pod_/);
      expect(result.title).toBe('Podcast with Metadata');
      expect(result.format).toBe('conversation');
      expect(result.createdBy).toBe(testUser.id);
      expect(result.sourceIds).toContain(doc.id);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]?.id).toBe(doc.id);
      expect(result.description).toBe('A test podcast description');
      expect(result.setupInstructions).toBe('Lead with the bill breakdown');
      expect(result.promptInstructions).toBe('Make it funny');
      expect(result.targetDurationMinutes).toBe(10);
      expect(result.hostVoice).toBe('Charon');
      expect(result.coHostVoice).toBe('Kore');
      expectIsoTimestamp(result.createdAt);
      expectIsoTimestamp(result.updatedAt);

      const [persisted] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, result.id as PodcastId));
      expect(persisted).toBeDefined();
      expect(persisted?.title).toBe('Podcast with Metadata');
      expect(persisted?.createdBy).toBe(testUser.id);
    });

    it('generates a default title when title is omitted', async () => {
      const context = createMockContext(runtime, user);
      const result = await handlers.create({
        context,
        input: { format: 'conversation' as const },
        errors,
      });

      expect(result.title).toMatch(/\S/);
    });
  });

  describe('update handler', () => {
    it('updates multiple fields and persists changes', async () => {
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        title: 'Original Title',
        description: 'Original',
      });
      const context = createMockContext(runtime, user);

      const result = await handlers.update({
        context,
        input: {
          id: podcast.id,
          title: 'Updated Title',
          description: 'Updated description',
          setupInstructions: 'Focus on payment options',
          promptInstructions: 'Updated instructions',
          targetDurationMinutes: 10,
        },
        errors,
      });

      expect(result.id).toBe(podcast.id);
      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated description');
      expect(result.setupInstructions).toBe('Focus on payment options');
      expect(result.promptInstructions).toBe('Updated instructions');
      expect(result.targetDurationMinutes).toBe(10);
      expectIsoTimestamp(result.createdAt);
      expectIsoTimestamp(result.updatedAt);

      const [persisted] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id as PodcastId));
      expect(persisted?.title).toBe('Updated Title');
      expect(persisted?.description).toBe('Updated description');
    });

    it('returns PODCAST_NOT_FOUND for missing or non-owned resources', async () => {
      const context = createMockContext(runtime, user);
      await expectHandlerErrorCode(
        () =>
          handlers.update({
            context,
            input: { id: 'pod_00000000000000' as PodcastId, title: 'Missing' },
            errors,
          }),
        'PODCAST_NOT_FOUND',
      );

      const otherUser = createTestUser();
      await insertTestUser(ctx, otherUser);
      const otherPodcast = await insertTestPodcast(ctx, otherUser.id);
      await expectHandlerErrorCode(
        () =>
          handlers.update({
            context,
            input: { id: otherPodcast.id, title: 'No access' },
            errors,
          }),
        'PODCAST_NOT_FOUND',
      );
    });
  });

  describe('delete handler', () => {
    it('deletes a podcast and fails when deleting it again', async () => {
      const podcast = await insertTestPodcast(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      const deleted = await handlers.delete({
        context,
        input: { id: podcast.id },
        errors,
      });
      expect(deleted).toEqual({});

      const [afterDelete] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id as PodcastId));
      expect(afterDelete).toBeUndefined();

      await expectHandlerErrorCode(
        () =>
          handlers.delete({
            context,
            input: { id: podcast.id },
            errors,
          }),
        'PODCAST_NOT_FOUND',
      );
    });

    it('returns PODCAST_NOT_FOUND for non-owned podcasts', async () => {
      const otherUser = createTestUser();
      await insertTestUser(ctx, otherUser);
      const otherPodcast = await insertTestPodcast(ctx, otherUser.id);
      const context = createMockContext(runtime, user);

      await expectHandlerErrorCode(
        () =>
          handlers.delete({
            context,
            input: { id: otherPodcast.id },
            errors,
          }),
        'PODCAST_NOT_FOUND',
      );
    });
  });

  describe('generate handler', () => {
    it('creates a generation job and forwards quick-start instructions', async () => {
      const podcast = await insertTestPodcast(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      const result = await handlers.generate({
        context,
        input: {
          id: podcast.id,
          promptInstructions: 'Make it educational',
        },
        errors,
      });

      expect(result.jobId).toMatch(/^job_/);
      expect(result.status).toBe('pending');

      const [job] = await ctx.db
        .select()
        .from(jobTable)
        .where(eq(jobTable.id, result.jobId as JobId));
      expect(job).toBeDefined();
      expect(job?.type).toBe('generate-podcast');
      expect(
        (job?.payload as { promptInstructions?: string } | undefined)
          ?.promptInstructions,
      ).toBe('Make it educational');
    });

    it('returns existing pending job for idempotency', async () => {
      const podcast = await insertTestPodcast(ctx, testUser.id);
      const [existingJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-podcast',
          payload: { podcastId: podcast.id, userId: testUser.id },
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
        input: { id: podcast.id },
        errors,
      });

      expect(result.jobId).toBe(existingJob.id);
      expect(result.status).toBe('pending');
    });

    it('returns PODCAST_NOT_FOUND for missing or non-owned resources', async () => {
      const context = createMockContext(runtime, user);
      await expectHandlerErrorCode(
        () =>
          handlers.generate({
            context,
            input: { id: 'pod_nonexistent123' as PodcastId },
            errors,
          }),
        'PODCAST_NOT_FOUND',
      );

      const otherUser = createTestUser();
      await insertTestUser(ctx, otherUser);
      const otherPodcast = await insertTestPodcast(ctx, otherUser.id);
      await expectHandlerErrorCode(
        () =>
          handlers.generate({
            context,
            input: { id: otherPodcast.id },
            errors,
          }),
        'PODCAST_NOT_FOUND',
      );
    });
  });

  describe('generatePlan handler', () => {
    it('generates and persists an episode plan', async () => {
      const source = await insertTestSource(ctx, testUser.id, {
        title: 'Operational Notes',
        extractedText:
          'Teams need clear ownership, high quality sources, and measured rollout loops.',
      });
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        sourceIds: [source.id],
      });
      runtime = createTestRuntime(
        ctx,
        createMockLLM({
          response: {
            angle: 'Focus on rollout discipline.',
            openingHook: 'AI launches often fail in the handoff.',
            closingTakeaway: 'Start with one workflow and tighten feedback.',
            sections: [
              {
                heading: 'Why launches stall',
                summary: 'Operational gaps that block delivery.',
                keyPoints: ['No clear owner', 'Weak source quality'],
                sourceIds: [source.id],
                estimatedMinutes: 2,
              },
            ],
          },
        }),
      );
      const context = createMockContext(runtime, user);

      const result = await handlers.generatePlan({
        context,
        input: { id: podcast.id },
        errors,
      });

      expect(result.id).toBe(podcast.id);
      expect(result.episodePlan).toEqual({
        angle: 'Focus on rollout discipline.',
        openingHook: 'AI launches often fail in the handoff.',
        closingTakeaway: 'Start with one workflow and tighten feedback.',
        sections: [
          {
            heading: 'Why launches stall',
            summary: 'Operational gaps that block delivery.',
            keyPoints: ['No clear owner', 'Weak source quality'],
            sourceIds: [source.id],
            estimatedMinutes: 2,
          },
        ],
      });

      const [persisted] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id as PodcastId));
      expect(persisted?.episodePlan).toEqual(result.episodePlan);
    });

    it('returns PODCAST_PLAN_SOURCES_NOT_READY when a selected source is processing', async () => {
      const source = await insertTestSource(ctx, testUser.id, {
        status: 'processing',
      });
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        sourceIds: [source.id],
      });
      const context = createMockContext(runtime, user);

      await expectHandlerErrorCode(
        () =>
          handlers.generatePlan({
            context,
            input: { id: podcast.id },
            errors,
          }),
        'PODCAST_PLAN_SOURCES_NOT_READY',
      );
    });
  });

  describe('getJob handler', () => {
    it('returns completed jobs in serialized format', async () => {
      const podcast = await insertTestPodcast(ctx, testUser.id);
      const [createdJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-podcast',
          payload: { podcastId: podcast.id, userId: testUser.id },
          createdBy: testUser.id,
          status: 'completed',
          result: {
            scriptId: 'ver_123',
            segmentCount: 4,
            audioUrl: 'url',
            duration: 300,
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
      expect(result.type).toBe('generate-podcast');
      expect(result.status).toBe('completed');
      expect(result.result).toEqual({
        scriptId: 'ver_123',
        segmentCount: 4,
        audioUrl: 'url',
        duration: 300,
      });
      expectIsoTimestamp(result.createdAt);
      expectIsoTimestamp(result.updatedAt);
      expectIsoTimestamp(result.startedAt!);
      expectIsoTimestamp(result.completedAt!);
    });

    it('returns pending jobs with null optional fields', async () => {
      const podcast = await insertTestPodcast(ctx, testUser.id);
      const [createdJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-podcast',
          payload: { podcastId: podcast.id, userId: testUser.id },
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

  describe('saveChanges handler', () => {
    it('updates content and queues regeneration', async () => {
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        hostVoice: 'OldVoice',
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
      });
      const newSegments = [
        { speaker: 'host', line: 'New opening line!', index: 0 },
        { speaker: 'cohost', line: 'New response!', index: 1 },
      ];
      const context = createMockContext(runtime, user);

      const result = await handlers.saveChanges({
        context,
        input: {
          id: podcast.id,
          segments: newSegments,
          hostVoice: 'NewVoice',
          hostVoiceName: 'New Voice Name',
        },
        errors,
      });

      expect(result.jobId).toMatch(/^job_/);
      expect(result.status).toBe('pending');

      const [persistedPodcast] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id as PodcastId));
      expect(persistedPodcast?.hostVoice).toBe('NewVoice');
      expect(persistedPodcast?.segments).toEqual(newSegments);

      const [job] = await ctx.db
        .select()
        .from(jobTable)
        .where(eq(jobTable.id, result.jobId as JobId));
      expect(job).toBeDefined();
      expect(job?.type).toBe('generate-audio');
    });

    it('returns existing pending job for idempotency', async () => {
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
      });
      const [existingJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-podcast',
          payload: { podcastId: podcast.id, userId: testUser.id },
          createdBy: testUser.id,
          status: 'pending',
        })
        .returning();
      expect(existingJob).toBeDefined();
      if (!existingJob) {
        throw new Error('Expected pending job fixture');
      }

      const context = createMockContext(runtime, user);
      const result = await handlers.saveChanges({
        context,
        input: {
          id: podcast.id,
          segments: [{ speaker: 'host', line: 'New line', index: 0 }],
        },
        errors,
      });

      expect(result.jobId).toBe(existingJob.id);
      expect(result.status).toBe('pending');
    });

    it('queues regeneration even when segments are unchanged', async () => {
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
      });
      const context = createMockContext(runtime, user);

      const result = await handlers.saveChanges({
        context,
        input: {
          id: podcast.id,
          segments: DEFAULT_TEST_SEGMENTS,
        },
        errors,
      });

      expect(result.jobId).toMatch(/^job_/);
      expect(result.status).toBe('pending');
    });

    it('returns PODCAST_NOT_FOUND for missing or non-owned resources', async () => {
      const context = createMockContext(runtime, user);
      await expectHandlerErrorCode(
        () =>
          handlers.saveChanges({
            context,
            input: {
              id: 'pod_nonexistent123' as PodcastId,
              segments: [{ speaker: 'host', line: 'Missing', index: 0 }],
            },
            errors,
          }),
        'PODCAST_NOT_FOUND',
      );

      const otherUser = createTestUser();
      await insertTestUser(ctx, otherUser);
      const otherPodcast = await insertTestPodcast(ctx, otherUser.id, {
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
      });
      await expectHandlerErrorCode(
        () =>
          handlers.saveChanges({
            context,
            input: {
              id: otherPodcast.id,
              segments: [{ speaker: 'host', line: 'No access', index: 0 }],
            },
            errors,
          }),
        'PODCAST_NOT_FOUND',
      );
    });
  });

  describe('approve handler', () => {
    it('enforces admin role before approving', async () => {
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        status: 'ready',
      });
      const userContext = createMockContext(runtime, user);
      await expectHandlerErrorCode(
        () =>
          handlers.approve({
            context: userContext,
            input: { id: podcast.id },
            errors,
          }),
        'FORBIDDEN',
      );

      const adminTestUser = createTestUser({ role: 'admin' });
      await insertTestUser(ctx, adminTestUser);
      const adminContext = createMockContext(runtime, toUser(adminTestUser));
      await handlers.approve({
        context: adminContext,
        input: { id: podcast.id },
        errors,
      });

      const [persisted] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id as PodcastId));
      expect(persisted?.approvedBy).toBe(adminTestUser.id);
      expect(persisted?.approvedAt).not.toBeNull();
    });
  });

  describe('revokeApproval handler', () => {
    it('enforces admin role before revoking', async () => {
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        status: 'ready',
        approvedBy: testUser.id,
        approvedAt: new Date(),
      });
      const userContext = createMockContext(runtime, user);
      await expectHandlerErrorCode(
        () =>
          handlers.revokeApproval({
            context: userContext,
            input: { id: podcast.id },
            errors,
          }),
        'FORBIDDEN',
      );

      const adminTestUser = createTestUser({ role: 'admin' });
      await insertTestUser(ctx, adminTestUser);
      const adminContext = createMockContext(runtime, toUser(adminTestUser));
      await handlers.revokeApproval({
        context: adminContext,
        input: { id: podcast.id },
        errors,
      });

      const [persisted] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id as PodcastId));
      expect(persisted?.approvedBy).toBeNull();
      expect(persisted?.approvedAt).toBeNull();
    });
  });
});
