/**
 * Podcast Job Workflow Tests
 *
 * These tests exercise the full workflow from API → Queue → Worker to catch
 * state mismatches between what the API sets up and what the worker expects.
 *
 * Podcast has two main workflows:
 *
 * 1. Full Generation (generate-podcast job):
 *    API: startGeneration → drafting
 *    Worker: generateScript → generating_script → script_ready
 *    Worker: generateAudio → generating_audio → ready
 *
 * 2. Audio Regeneration (generate-audio job):
 *    API: saveAndQueueAudio → script_ready (via saveChanges)
 *    Worker: generateAudio → generating_audio → ready
 */
import { MockLLMLive, MockTTSLive } from '@repo/ai/testing';
import { withCurrentUser, Role, type User } from '@repo/auth/policy';
import {
  user as userTable,
  document as documentTable,
  podcast as podcastTable,
  VersionStatus,
} from '@repo/db/schema';
import {
  PodcastRepoLive,
  DocumentRepoLive,
  PersonaRepoLive,
  startGeneration,
  saveAndQueueAudio,
  generateScript,
  generateAudio,
} from '@repo/media';
import { QueueLive } from '@repo/queue';
import { createInMemoryStorage } from '@repo/storage/testing';
import {
  createTestContext,
  createTestUser,
  createTestDocument,
  createTestPodcast,
  resetAllFactories,
  DEFAULT_TEST_SEGMENTS,
  type TestContext,
} from '@repo/testing';
import { eq } from 'drizzle-orm';
import { Layer, ManagedRuntime } from 'effect';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// =============================================================================
// Test Setup
// =============================================================================

/**
 * In-memory storage instance for seeding document content.
 */
let inMemoryStorage: ReturnType<typeof createInMemoryStorage>;

/**
 * Create test runtime with all layers needed for workflow testing.
 */
const createWorkflowRuntime = (ctx: TestContext) => {
  inMemoryStorage = createInMemoryStorage();
  const mockAILayers = Layer.mergeAll(
    MockLLMLive,
    MockTTSLive,
    inMemoryStorage.layer,
  );

  const allLayers = Layer.mergeAll(
    ctx.dbLayer,
    mockAILayers,
    PodcastRepoLive.pipe(Layer.provide(ctx.dbLayer)),
    DocumentRepoLive.pipe(Layer.provide(ctx.dbLayer)),
    PersonaRepoLive.pipe(Layer.provide(ctx.dbLayer)),
    QueueLive.pipe(Layer.provide(ctx.dbLayer)),
  );

  return ManagedRuntime.make(allLayers);
};

/**
 * Insert a test user into the database.
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
 * Insert a test document into the database and seed content into storage.
 */
const insertTestDocument = async (
  ctx: TestContext,
  userId: string,
  options: Partial<Parameters<typeof createTestDocument>[0]> & {
    content?: string;
  } = {},
) => {
  const { content, ...docOptions } = options;
  const doc = createTestDocument({
    createdBy: userId,
    ...docOptions,
  });
  await ctx.db.insert(documentTable).values(doc);

  // Seed content into storage so getDocumentContent works
  const textContent =
    content ?? 'Test document content for podcast generation.';
  inMemoryStorage.getStore().set(doc.contentKey, {
    data: Buffer.from(textContent),
    contentType: 'text/plain',
  });

  return doc;
};

/**
 * Insert a test podcast into the database.
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
// Workflow Tests
// =============================================================================

describe('podcast job workflow', () => {
  let ctx: TestContext;
  let runtime: ReturnType<typeof createWorkflowRuntime>;
  let testUser: ReturnType<typeof createTestUser>;
  let user: User;

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    runtime = createWorkflowRuntime(ctx);
    testUser = createTestUser();
    user = {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      role: Role.USER,
    };
    await insertTestUser(ctx, testUser);
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  describe('full generation workflow (generate-podcast)', () => {
    it('worker can process full generation job after API enqueues it', async () => {
      // Arrange: Create a podcast with a linked document
      const doc = await insertTestDocument(ctx, testUser.id, {
        title: 'Test Document',
      });
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        title: 'Full Generation Test',
        status: 'drafting',
        sourceDocumentIds: [doc.id],
      });

      // Step 1: Call the API use case (startGeneration)
      const startResult = await runtime.runPromise(
        withCurrentUser(user)(
          startGeneration({
            podcastId: podcast.id,
          }),
        ),
      );

      expect(startResult.jobId).toBeDefined();
      expect(startResult.status).toBe('pending');

      // Verify: Podcast status was updated to drafting
      const [afterStart] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id));
      expect(afterStart?.status).toBe(VersionStatus.DRAFTING);

      // Step 2: Worker runs generateScript
      const scriptResult = await runtime.runPromise(
        withCurrentUser(user)(
          generateScript({
            podcastId: podcast.id,
          }),
        ),
      );

      expect(scriptResult.podcast).toBeDefined();
      expect(scriptResult.segmentCount).toBeGreaterThan(0);

      // Verify: Status is now script_ready
      const [afterScript] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id));
      expect(afterScript?.status).toBe(VersionStatus.SCRIPT_READY);

      // Step 3: Worker runs generateAudio
      const audioResult = await runtime.runPromise(
        withCurrentUser(user)(
          generateAudio({
            podcastId: podcast.id,
          }),
        ),
      );

      expect(audioResult.podcast).toBeDefined();
      expect(audioResult.audioUrl).toBeDefined();
      expect(audioResult.duration).toBeGreaterThan(0);

      // Verify: Final status is ready
      const [afterAudio] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id));
      expect(afterAudio?.status).toBe(VersionStatus.READY);
      expect(afterAudio?.audioUrl).toBeDefined();
    });
  });

  describe('audio regeneration workflow (generate-audio)', () => {
    it('worker can process audio job after API enqueues it', async () => {
      // Arrange: Create a podcast that's already ready (has audio)
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        title: 'Regeneration Test',
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
        audioUrl: 'https://old-audio.example.com/audio.wav',
        duration: 100,
      });

      // Step 1: Call the API use case (saveAndQueueAudio)
      const startResult = await runtime.runPromise(
        withCurrentUser(user)(
          saveAndQueueAudio({
            podcastId: podcast.id,
            hostVoice: 'Fenrir', // Change voice to trigger regeneration
            hostVoiceName: 'Fenrir',
          }),
        ),
      );

      expect(startResult.jobId).toBeDefined();
      expect(startResult.status).toBe('pending');

      // Verify: Podcast status was updated to script_ready (by saveChanges)
      const [afterSave] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id));
      expect(afterSave?.status).toBe(VersionStatus.SCRIPT_READY);
      // Audio should be cleared
      expect(afterSave?.audioUrl).toBeNull();

      // Step 2: Worker runs generateAudio
      const audioResult = await runtime.runPromise(
        withCurrentUser(user)(
          generateAudio({
            podcastId: podcast.id,
          }),
        ),
      );

      expect(audioResult.podcast).toBeDefined();
      expect(audioResult.audioUrl).toBeDefined();

      // Verify: Final status is ready with new audio
      const [afterAudio] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id));
      expect(afterAudio?.status).toBe(VersionStatus.READY);
      expect(afterAudio?.audioUrl).not.toBe(
        'https://old-audio.example.com/audio.wav',
      );
    });

    it('worker can regenerate after script edits', async () => {
      // Arrange: Create a podcast that's ready
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        title: 'Script Edit Test',
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
        audioUrl: 'https://old-audio.example.com/audio.wav',
        duration: 50,
      });

      // Step 1: Save new segments via API
      const startResult = await runtime.runPromise(
        withCurrentUser(user)(
          saveAndQueueAudio({
            podcastId: podcast.id,
            segments: [
              {
                speaker: 'Host',
                line: 'Updated line with new content!',
                index: 0,
              },
              { speaker: 'Co-Host', line: 'Added a new segment!', index: 1 },
            ],
          }),
        ),
      );

      expect(startResult.status).toBe('pending');

      // Verify status transition
      const [afterSave] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id));
      expect(afterSave?.status).toBe(VersionStatus.SCRIPT_READY);

      // Step 2: Worker processes the job
      const audioResult = await runtime.runPromise(
        withCurrentUser(user)(
          generateAudio({
            podcastId: podcast.id,
          }),
        ),
      );

      expect(audioResult.podcast.status).toBe(VersionStatus.READY);
    });
  });

  describe('state validation', () => {
    it('full generation uses consistent status expectations', async () => {
      /**
       * Documents expected state transitions for full generation.
       */
      const doc = await insertTestDocument(ctx, testUser.id);
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        status: 'drafting',
        sourceDocumentIds: [doc.id],
      });

      const statusHistory: string[] = [];

      // Initial
      const [initial] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id));
      statusHistory.push(initial!.status);

      // After API enqueues
      await runtime.runPromise(
        withCurrentUser(user)(startGeneration({ podcastId: podcast.id })),
      );
      const [afterApi] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id));
      statusHistory.push(afterApi!.status);

      // After script generation
      await runtime.runPromise(
        withCurrentUser(user)(generateScript({ podcastId: podcast.id })),
      );
      const [afterScript] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id));
      statusHistory.push(afterScript!.status);

      // After audio generation
      await runtime.runPromise(
        withCurrentUser(user)(generateAudio({ podcastId: podcast.id })),
      );
      const [afterAudio] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id));
      statusHistory.push(afterAudio!.status);

      expect(statusHistory).toEqual([
        VersionStatus.DRAFTING, // Initial
        VersionStatus.DRAFTING, // After API (startGeneration keeps drafting)
        VersionStatus.SCRIPT_READY, // After script generation
        VersionStatus.READY, // After audio generation
      ]);
    });

    it('audio regeneration uses consistent status expectations', async () => {
      /**
       * Documents expected state transitions for audio regeneration.
       */
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
        audioUrl: 'https://example.com/audio.wav',
        duration: 10,
      });

      const statusHistory: string[] = [];

      // Initial
      const [initial] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id));
      statusHistory.push(initial!.status);

      // After API enqueues (saveAndQueueAudio)
      await runtime.runPromise(
        withCurrentUser(user)(
          saveAndQueueAudio({
            podcastId: podcast.id,
            hostVoice: 'Fenrir',
            hostVoiceName: 'Fenrir',
          }),
        ),
      );
      const [afterApi] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id));
      statusHistory.push(afterApi!.status);

      // After audio generation
      await runtime.runPromise(
        withCurrentUser(user)(generateAudio({ podcastId: podcast.id })),
      );
      const [afterAudio] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id));
      statusHistory.push(afterAudio!.status);

      expect(statusHistory).toEqual([
        VersionStatus.READY, // Initial
        VersionStatus.SCRIPT_READY, // After API (saveChanges sets script_ready)
        VersionStatus.READY, // After audio generation
      ]);
    });

    it('generateAudio accepts script_ready status (set by saveChanges)', async () => {
      /**
       * Key alignment test: API sets script_ready, worker expects script_ready.
       */
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
      });

      // Simulate what saveChanges does: set status to script_ready
      await ctx.db
        .update(podcastTable)
        .set({ status: VersionStatus.SCRIPT_READY })
        .where(eq(podcastTable.id, podcast.id));

      // Worker should be able to process from script_ready status
      const result = await runtime.runPromise(
        withCurrentUser(user)(generateAudio({ podcastId: podcast.id })),
      );

      expect(result.podcast).toBeDefined();
      expect(result.podcast.status).toBe(VersionStatus.READY);
    });
  });

  describe('idempotency', () => {
    it('startGeneration returns existing pending job when called twice', async () => {
      const doc = await insertTestDocument(ctx, testUser.id);
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        status: 'drafting',
        sourceDocumentIds: [doc.id],
      });

      // First call
      const result1 = await runtime.runPromise(
        withCurrentUser(user)(startGeneration({ podcastId: podcast.id })),
      );

      // Second call
      const result2 = await runtime.runPromise(
        withCurrentUser(user)(startGeneration({ podcastId: podcast.id })),
      );

      expect(result1.jobId).toBe(result2.jobId);
    });

    it('saveAndQueueAudio creates job and transitions status correctly', async () => {
      // Note: saveAndQueueAudio can't be called twice because the first call
      // changes status from 'ready' to 'script_ready', and saveChanges requires 'ready'.
      // This test verifies the job is created and status transitions work.
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
      });

      const result = await runtime.runPromise(
        withCurrentUser(user)(
          saveAndQueueAudio({
            podcastId: podcast.id,
            hostVoice: 'Fenrir',
            hostVoiceName: 'Fenrir',
          }),
        ),
      );

      expect(result.jobId).toBeDefined();
      expect(result.status).toBe('pending');

      // Verify status changed
      const [updated] = await ctx.db
        .select()
        .from(podcastTable)
        .where(eq(podcastTable.id, podcast.id));
      expect(updated?.status).toBe(VersionStatus.SCRIPT_READY);
    });
  });
});
