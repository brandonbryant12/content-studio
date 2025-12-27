import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Effect, Layer, Cause, Exit } from 'effect';
import { eq } from 'drizzle-orm';
import { generateScript } from './generate-script';
import { PodcastRepoLive } from '../repos/podcast-repo';
import { ScriptVersionRepoLive } from '../repos/script-version-repo';
import { DocumentsLive } from '../../document';
import {
  createTestContext,
  createTestDocument,
  createTestUser,
  createTestPodcast,
  createTestPodcastScript,
  resetAllFactories,
  createMockAILayers,
  createTestUserLayer,
  type TestContext,
} from '@repo/testing';
import { document, podcast, podcastScript, user } from '@repo/db/schema';
import { PodcastNotFound, ScriptNotFound } from '@repo/effect/errors';

// Valid UUID that doesn't exist in the database
const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000';

/** Helper to check if an Effect fails with a specific error type */
const expectEffectToFailWith = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  effect: Effect.Effect<any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layers: Layer.Layer<any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbLayer: Layer.Layer<any, any, any>,
  errorTag: string,
) => {
  const provided = effect.pipe(
    Effect.provide(layers),
    Effect.provide(dbLayer),
  ) as Effect.Effect<unknown, unknown, never>;
  const exit = await Effect.runPromiseExit(provided);
  expect(Exit.isFailure(exit)).toBe(true);
  if (Exit.isFailure(exit)) {
    const error = Cause.failureOption(exit.cause);
    expect(error._tag).toBe('Some');
    if (error._tag === 'Some') {
      expect((error.value as { _tag: string })._tag).toBe(errorTag);
    }
  }
};

describe('generateScript use case', () => {
  let ctx: TestContext;
  let testUser: ReturnType<typeof createTestUser>;
  let testDoc: ReturnType<typeof createTestDocument>;
  let testPodcast: ReturnType<typeof createTestPodcast>;

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    testUser = createTestUser();
    testDoc = createTestDocument({ createdBy: testUser.id });
    testPodcast = createTestPodcast({
      createdBy: testUser.id,
      sourceDocumentIds: [testDoc.id],
    });

    // Insert test user
    await ctx.db.insert(user).values({
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Insert document
    await ctx.db.insert(document).values(testDoc);

    // Insert podcast
    await ctx.db.insert(podcast).values(testPodcast);
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  const createLayers = () => {
    const repoLayers = Layer.mergeAll(PodcastRepoLive, ScriptVersionRepoLive);
    const aiLayers = createMockAILayers();
    const userLayer = createTestUserLayer(testUser);
    const documentsLayer = DocumentsLive;

    return Layer.mergeAll(repoLayers, aiLayers, userLayer, documentsLayer);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runEffect = <A, E>(effect: Effect.Effect<A, E, any>): Promise<A> => {
    const provided = effect.pipe(
      Effect.provide(createLayers()),
      Effect.provide(ctx.dbLayer),
    ) as Effect.Effect<A, E, never>;
    return Effect.runPromise(provided);
  };

  describe('creating new version', () => {
    it('should create new version and generate script', async () => {
      const result = await runEffect(
        generateScript({
          podcastId: testPodcast.id,
        }),
      );

      expect(result.version).toBeDefined();
      expect(result.version.status).toBe('script_ready');
      expect(result.version.segments).toBeDefined();
      expect(result.segmentCount).toBeGreaterThan(0);
    });

    it('should copy podcast settings to new version', async () => {
      // Update podcast with specific settings
      await ctx.db
        .update(podcast)
        .set({
          hostVoice: 'custom-host',
          coHostVoice: 'custom-cohost',
          promptInstructions: 'Be funny',
        })
        .where(eq(podcast.id, testPodcast.id));

      const result = await runEffect(
        generateScript({
          podcastId: testPodcast.id,
        }),
      );

      expect(result.version.hostVoice).toBe('custom-host');
      expect(result.version.coHostVoice).toBe('custom-cohost');
    });

    it('should use provided promptInstructions over podcast settings', async () => {
      const result = await runEffect(
        generateScript({
          podcastId: testPodcast.id,
          promptInstructions: 'Override instructions',
        }),
      );

      expect(result.version.promptInstructions).toBe('Override instructions');
    });

    it('should update podcast metadata from LLM output', async () => {
      await runEffect(
        generateScript({
          podcastId: testPodcast.id,
        }),
      );

      // Verify podcast was updated with LLM-generated title/description
      const [updatedPodcast] = await ctx.db
        .select()
        .from(podcast)
        .where(eq(podcast.id, testPodcast.id));

      // Mock LLM returns "Test Podcast Title"
      expect(updatedPodcast?.title).toBe('Test Podcast Title');
    });
  });

  describe('updating existing version', () => {
    it('should update existing version when versionId provided', async () => {
      // Create a draft version first
      const draftScript = createTestPodcastScript({
        podcastId: testPodcast.id,
        status: 'draft',
        segments: null,
      });
      await ctx.db.insert(podcastScript).values(draftScript);

      const result = await runEffect(
        generateScript({
          podcastId: testPodcast.id,
          versionId: draftScript.id,
        }),
      );

      expect(result.version.id).toBe(draftScript.id);
      expect(result.version.status).toBe('script_ready');
      expect(result.version.segments).toBeDefined();
    });

    it('should fail with ScriptNotFound for non-existent versionId', async () => {
      await expectEffectToFailWith(
        generateScript({
          podcastId: testPodcast.id,
          versionId: NON_EXISTENT_ID,
        }),
        createLayers(),
        ctx.dbLayer,
        'ScriptNotFound',
      );
    });
  });

  describe('error handling', () => {
    it('should fail with PodcastNotFound for non-existent podcast', async () => {
      await expectEffectToFailWith(
        generateScript({
          podcastId: NON_EXISTENT_ID,
        }),
        createLayers(),
        ctx.dbLayer,
        'PodcastNotFound',
      );
    });
  });

  describe('script content', () => {
    it('should generate segments with speaker and line', async () => {
      const result = await runEffect(
        generateScript({
          podcastId: testPodcast.id,
        }),
      );

      expect(result.version.segments).toBeDefined();
      expect(Array.isArray(result.version.segments)).toBe(true);

      const segments = result.version.segments!;
      expect(segments.length).toBeGreaterThan(0);

      // Each segment should have speaker, line, and index
      for (const segment of segments) {
        expect(segment).toHaveProperty('speaker');
        expect(segment).toHaveProperty('line');
        expect(segment).toHaveProperty('index');
      }
    });

    it('should generate summary', async () => {
      const result = await runEffect(
        generateScript({
          podcastId: testPodcast.id,
        }),
      );

      expect(result.version.summary).toBeDefined();
      expect(typeof result.version.summary).toBe('string');
    });

    it('should store generation prompt for audit', async () => {
      const result = await runEffect(
        generateScript({
          podcastId: testPodcast.id,
        }),
      );

      expect(result.version.generationPrompt).toBeDefined();
      expect(result.version.generationPrompt).toContain('System:');
      expect(result.version.generationPrompt).toContain('User:');
    });
  });
});
