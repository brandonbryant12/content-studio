/**
 * Voiceover Job Workflow Tests
 *
 * These tests exercise the full workflow from API → Queue → Worker to catch
 * state mismatches between what the API sets up and what the worker expects.
 *
 * This pattern catches bugs like:
 * - API sets status to X before enqueueing, but worker expects status Y
 * - Worker expects certain fields populated that API doesn't set
 * - Race conditions in job processing
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Layer, ManagedRuntime } from 'effect';
import {
  createTestContext,
  createTestUser,
  resetAllFactories,
  type TestContext,
} from '@repo/testing';
import {
  createInMemoryStorage,
  MockLLMLive,
  MockTTSLive,
} from '@repo/testing/mocks';
import {
  user as userTable,
  voiceover as voiceoverTable,
  generateVoiceoverId,
  VoiceoverStatus,
} from '@repo/db/schema';
import { withCurrentUser, Role, type User } from '@repo/auth/policy';
import {
  VoiceoverRepoLive,
  VoiceoverCollaboratorRepoLive,
  startVoiceoverGeneration,
  generateVoiceoverAudio,
} from '@repo/media';
import { QueueLive } from '@repo/queue';
import { eq } from 'drizzle-orm';

// =============================================================================
// Test Setup
// =============================================================================

/**
 * Create test runtime with all layers needed for workflow testing.
 */
const createWorkflowRuntime = (ctx: TestContext) => {
  const inMemoryStorage = createInMemoryStorage();
  const mockAILayers = Layer.mergeAll(
    MockLLMLive,
    MockTTSLive,
    inMemoryStorage.layer,
  );

  const allLayers = Layer.mergeAll(
    ctx.dbLayer,
    mockAILayers,
    VoiceoverRepoLive.pipe(Layer.provide(ctx.dbLayer)),
    VoiceoverCollaboratorRepoLive.pipe(Layer.provide(ctx.dbLayer)),
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
 * Insert a test voiceover into the database.
 */
const insertTestVoiceover = async (
  ctx: TestContext,
  userId: string,
  options: {
    title?: string;
    text?: string;
    status?: 'drafting' | 'generating_audio' | 'ready' | 'failed';
  } = {},
) => {
  const voiceover = {
    id: generateVoiceoverId(),
    title: options.title ?? 'Test Voiceover',
    text: options.text ?? 'This is test text for the voiceover.',
    voice: 'Charon',
    voiceName: 'Charon',
    audioUrl: null,
    duration: null,
    status: options.status ?? 'drafting',
    errorMessage: null,
    ownerHasApproved: false,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await ctx.db.insert(voiceoverTable).values(voiceover);
  return voiceover;
};

// =============================================================================
// Workflow Tests
// =============================================================================

describe('voiceover job workflow', () => {
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

  describe('API → Queue → Worker flow', () => {
    it('worker can process job after API enqueues it', async () => {
      // Arrange: Create a voiceover in drafting status
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        title: 'Workflow Test',
        text: 'This is a test voiceover for workflow testing.',
        status: 'drafting',
      });

      // Step 1: Call the API use case (startVoiceoverGeneration)
      // This simulates what happens when the user clicks "Generate"
      const startResult = await runtime.runPromise(
        withCurrentUser(user)(
          startVoiceoverGeneration({
            voiceoverId: voiceover.id,
            userId: user.id,
          }),
        ),
      );

      expect(startResult.jobId).toBeDefined();
      expect(startResult.status).toBe('pending');

      // Verify: Voiceover status was updated to generating_audio
      const [afterStart] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, voiceover.id));
      expect(afterStart?.status).toBe(VoiceoverStatus.GENERATING_AUDIO);

      // Step 2: Simulate what the worker does - call generateVoiceoverAudio
      // The worker picks up the job and calls this use case
      const generateResult = await runtime.runPromise(
        withCurrentUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
            userId: user.id,
          }),
        ),
      );

      // Verify: Generation succeeded
      expect(generateResult.voiceover).toBeDefined();
      expect(generateResult.audioUrl).toBeDefined();
      expect(generateResult.duration).toBeGreaterThan(0);

      // Verify: Final status is ready
      const [afterGenerate] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, voiceover.id));
      expect(afterGenerate?.status).toBe(VoiceoverStatus.READY);
      expect(afterGenerate?.audioUrl).toBeDefined();
    });

    it('worker can retry after failure (failed → generating_audio → ready)', async () => {
      // Arrange: Create a voiceover in failed status (previous attempt failed)
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        title: 'Retry Test',
        text: 'This is a test for retry workflow.',
        status: 'failed',
      });

      // Step 1: User clicks "Retry" - API enqueues new job
      const startResult = await runtime.runPromise(
        withCurrentUser(user)(
          startVoiceoverGeneration({
            voiceoverId: voiceover.id,
            userId: user.id,
          }),
        ),
      );

      expect(startResult.status).toBe('pending');

      // Verify status transition
      const [afterStart] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, voiceover.id));
      expect(afterStart?.status).toBe(VoiceoverStatus.GENERATING_AUDIO);

      // Step 2: Worker processes the job
      const generateResult = await runtime.runPromise(
        withCurrentUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
            userId: user.id,
          }),
        ),
      );

      expect(generateResult.voiceover.status).toBe(VoiceoverStatus.READY);
    });

    it('worker can regenerate existing audio (ready → generating_audio → ready)', async () => {
      // Arrange: Create a voiceover that already has audio
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        title: 'Regenerate Test',
        text: 'Updated text that needs new audio.',
        status: 'ready',
      });

      // Update with existing audio
      await ctx.db
        .update(voiceoverTable)
        .set({
          audioUrl: 'https://old-audio.example.com/audio.wav',
          duration: 100,
        })
        .where(eq(voiceoverTable.id, voiceover.id));

      // Step 1: User clicks "Regenerate" - API enqueues new job
      const startResult = await runtime.runPromise(
        withCurrentUser(user)(
          startVoiceoverGeneration({
            voiceoverId: voiceover.id,
            userId: user.id,
          }),
        ),
      );

      expect(startResult.status).toBe('pending');

      // Step 2: Worker processes the job
      const generateResult = await runtime.runPromise(
        withCurrentUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
            userId: user.id,
          }),
        ),
      );

      // Verify: New audio was generated
      expect(generateResult.voiceover.status).toBe(VoiceoverStatus.READY);
      expect(generateResult.audioUrl).not.toBe(
        'https://old-audio.example.com/audio.wav',
      );
    });
  });

  describe('state validation', () => {
    it('API and worker use consistent status expectations', async () => {
      /**
       * This test documents the expected state transitions.
       * If either the API or worker changes status expectations,
       * this test should fail, alerting us to the mismatch.
       */
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        text: 'State validation test.',
        status: 'drafting',
      });

      // Track status transitions
      const statusHistory: string[] = [];

      // Initial status
      const [initial] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, voiceover.id));
      statusHistory.push(initial!.status);

      // After API call
      await runtime.runPromise(
        withCurrentUser(user)(
          startVoiceoverGeneration({
            voiceoverId: voiceover.id,
            userId: user.id,
          }),
        ),
      );

      const [afterApi] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, voiceover.id));
      statusHistory.push(afterApi!.status);

      // After worker processing
      await runtime.runPromise(
        withCurrentUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
            userId: user.id,
          }),
        ),
      );

      const [afterWorker] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, voiceover.id));
      statusHistory.push(afterWorker!.status);

      // Document expected transitions
      expect(statusHistory).toEqual([
        VoiceoverStatus.DRAFTING, // Initial
        VoiceoverStatus.GENERATING_AUDIO, // After API enqueues job
        VoiceoverStatus.READY, // After worker completes
      ]);
    });

    it('worker accepts all statuses that API can set before enqueueing', async () => {
      /**
       * The API can enqueue jobs from various starting statuses.
       * The worker must accept the status that the API sets (generating_audio).
       *
       * This test ensures the worker's status validation aligns with the API's behavior.
       */
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        text: 'Status alignment test.',
        status: 'drafting',
      });

      // Simulate what the API does: set status to generating_audio
      await ctx.db
        .update(voiceoverTable)
        .set({ status: VoiceoverStatus.GENERATING_AUDIO })
        .where(eq(voiceoverTable.id, voiceover.id));

      // Worker should be able to process from generating_audio status
      // (This is the key test case that would have caught the original bug)
      const result = await runtime.runPromise(
        withCurrentUser(user)(
          generateVoiceoverAudio({
            voiceoverId: voiceover.id,
            userId: user.id,
          }),
        ),
      );

      expect(result.voiceover).toBeDefined();
      expect(result.voiceover.status).toBe(VoiceoverStatus.READY);
    });
  });

  describe('idempotency', () => {
    it('returns existing pending job when called twice', async () => {
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        text: 'Idempotency test.',
        status: 'drafting',
      });

      // First call
      const result1 = await runtime.runPromise(
        withCurrentUser(user)(
          startVoiceoverGeneration({
            voiceoverId: voiceover.id,
            userId: user.id,
          }),
        ),
      );

      // Second call (should return same job)
      const result2 = await runtime.runPromise(
        withCurrentUser(user)(
          startVoiceoverGeneration({
            voiceoverId: voiceover.id,
            userId: user.id,
          }),
        ),
      );

      expect(result1.jobId).toBe(result2.jobId);
    });
  });
});
