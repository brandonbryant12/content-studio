import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Effect, Layer, Cause, Exit } from 'effect';
import { PodcastRepo, PodcastRepoLive } from './podcast-repo';
import {
  createTestContext,
  createTestPodcast,
  createTestDocument,
  createTestUser,
  resetAllFactories,
  type TestContext,
} from '@repo/testing';
import { document, podcast, podcastScript, user } from '@repo/db/schema';
import { PodcastNotFound, DocumentNotFound } from '@repo/db/errors';
import { Db } from '@repo/db/effect';

// Valid UUID that doesn't exist in the database
const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000';

/** Helper to check if an Effect fails with a specific error type */
const expectToFail = async (
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

describe('PodcastRepo', () => {
  let ctx: TestContext;
  let testUser: ReturnType<typeof createTestUser>;

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    testUser = createTestUser();

    // Insert test user
    await ctx.db.insert(user).values({
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  const runEffect = <A, E>(
    effect: Effect.Effect<A, E, PodcastRepo | Db>,
  ): Promise<A> =>
    Effect.runPromise(
      effect.pipe(
        Effect.provide(PodcastRepoLive),
        Effect.provide(ctx.dbLayer),
      ),
    );

  describe('insert', () => {
    it('should create a podcast without documents', async () => {
      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const data = {
        title: 'Test Podcast',
        description: 'A test podcast',
        format: 'conversation' as const,
        createdBy: testUser.id,
      };

      const result = await runEffect(repo.insert(data, []));

      expect(result.title).toBe('Test Podcast');
      expect(result.description).toBe('A test podcast');
      expect(result.format).toBe('conversation');
      expect(result.documents).toEqual([]);
      expect(result.createdBy).toBe(testUser.id);
    });

    it('should create a podcast with documents', async () => {
      // Create test documents first
      const doc1 = createTestDocument({ createdBy: testUser.id });
      const doc2 = createTestDocument({ createdBy: testUser.id });

      await ctx.db.insert(document).values([doc1, doc2]);

      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const data = {
        title: 'Test Podcast',
        format: 'conversation' as const,
        createdBy: testUser.id,
      };

      const result = await runEffect(repo.insert(data, [doc1.id, doc2.id]));

      expect(result.documents).toHaveLength(2);
      expect(result.documents.map((d) => d.id)).toContain(doc1.id);
      expect(result.documents.map((d) => d.id)).toContain(doc2.id);
    });
  });

  describe('findById', () => {
    it('should find an existing podcast', async () => {
      const testPodcast = createTestPodcast({ createdBy: testUser.id });
      await ctx.db.insert(podcast).values(testPodcast);

      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const result = await runEffect(repo.findById(testPodcast.id));

      expect(result.id).toBe(testPodcast.id);
      expect(result.title).toBe(testPodcast.title);
    });

    it('should fail with PodcastNotFound for non-existent podcast', async () => {
      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));

      await expectToFail(
        repo.findById(NON_EXISTENT_ID),
        PodcastRepoLive,
        ctx.dbLayer,
        'PodcastNotFound',
      );
    });
  });

  describe('findByIdFull', () => {
    it('should return podcast with active version', async () => {
      const testPodcast = createTestPodcast({ createdBy: testUser.id });
      await ctx.db.insert(podcast).values(testPodcast);

      // Create an active version
      await ctx.db.insert(podcastScript).values({
        podcastId: testPodcast.id,
        version: 1,
        isActive: true,
        status: 'script_ready',
        segments: [{ speaker: 'host', line: 'Hello!', index: 0 }],
      });

      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const result = await runEffect(repo.findByIdFull(testPodcast.id));

      expect(result.id).toBe(testPodcast.id);
      expect(result.activeVersion).not.toBeNull();
      expect(result.activeVersion?.status).toBe('script_ready');
    });

    it('should return null activeVersion when no active version exists', async () => {
      const testPodcast = createTestPodcast({ createdBy: testUser.id });
      await ctx.db.insert(podcast).values(testPodcast);

      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const result = await runEffect(repo.findByIdFull(testPodcast.id));

      expect(result.activeVersion).toBeNull();
    });
  });

  describe('update', () => {
    it('should update podcast fields', async () => {
      const testPodcast = createTestPodcast({ createdBy: testUser.id });
      await ctx.db.insert(podcast).values(testPodcast);

      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const result = await runEffect(
        repo.update(testPodcast.id, {
          title: 'Updated Title',
          description: 'Updated description',
        }),
      );

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated description');
    });

    it('should update documentIds', async () => {
      const doc = createTestDocument({ createdBy: testUser.id });
      await ctx.db.insert(document).values(doc);

      const testPodcast = createTestPodcast({ createdBy: testUser.id });
      await ctx.db.insert(podcast).values(testPodcast);

      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const result = await runEffect(
        repo.update(testPodcast.id, {
          documentIds: [doc.id],
        }),
      );

      expect(result.sourceDocumentIds).toContain(doc.id);
    });

    it('should fail with PodcastNotFound for non-existent podcast', async () => {
      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));

      await expectToFail(
        repo.update(NON_EXISTENT_ID, { title: 'New' }),
        PodcastRepoLive,
        ctx.dbLayer,
        'PodcastNotFound',
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing podcast', async () => {
      const testPodcast = createTestPodcast({ createdBy: testUser.id });
      await ctx.db.insert(podcast).values(testPodcast);

      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const result = await runEffect(repo.delete(testPodcast.id));

      expect(result).toBe(true);

      // Verify deletion
      await expectToFail(
        repo.findById(testPodcast.id),
        PodcastRepoLive,
        ctx.dbLayer,
        'PodcastNotFound',
      );
    });

    it('should return false for non-existent podcast', async () => {
      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const result = await runEffect(repo.delete(NON_EXISTENT_ID));

      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('should list podcasts for a user', async () => {
      const podcast1 = createTestPodcast({ createdBy: testUser.id });
      const podcast2 = createTestPodcast({ createdBy: testUser.id });
      await ctx.db.insert(podcast).values([podcast1, podcast2]);

      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const result = await runEffect(
        repo.list({ createdBy: testUser.id }),
      );

      expect(result).toHaveLength(2);
    });

    it('should respect limit and offset', async () => {
      for (let i = 0; i < 5; i++) {
        await ctx.db.insert(podcast).values(
          createTestPodcast({ createdBy: testUser.id }),
        );
      }

      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const result = await runEffect(
        repo.list({ createdBy: testUser.id, limit: 2, offset: 1 }),
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('listWithActiveVersionSummary', () => {
    it('should include active version summary', async () => {
      const testPodcast = createTestPodcast({ createdBy: testUser.id });
      await ctx.db.insert(podcast).values(testPodcast);

      await ctx.db.insert(podcastScript).values({
        podcastId: testPodcast.id,
        version: 1,
        isActive: true,
        status: 'audio_ready',
        duration: 300,
      });

      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const result = await runEffect(
        repo.listWithActiveVersionSummary({ createdBy: testUser.id }),
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.activeVersion).not.toBeNull();
      expect(result[0]?.activeVersion?.status).toBe('audio_ready');
      expect(result[0]?.activeVersion?.duration).toBe(300);
    });
  });

  describe('count', () => {
    it('should count podcasts for a user', async () => {
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert(podcast).values(
          createTestPodcast({ createdBy: testUser.id }),
        );
      }

      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const result = await runEffect(repo.count({ createdBy: testUser.id }));

      expect(result).toBe(3);
    });
  });

  describe('verifyDocumentsExist', () => {
    it('should return documents when all exist and are owned by user', async () => {
      const doc1 = createTestDocument({ createdBy: testUser.id });
      const doc2 = createTestDocument({ createdBy: testUser.id });
      await ctx.db.insert(document).values([doc1, doc2]);

      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const result = await runEffect(
        repo.verifyDocumentsExist([doc1.id, doc2.id], testUser.id),
      );

      expect(result).toHaveLength(2);
    });

    it('should fail when document does not exist', async () => {
      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));

      await expectToFail(
        repo.verifyDocumentsExist([NON_EXISTENT_ID], testUser.id),
        PodcastRepoLive,
        ctx.dbLayer,
        'DocumentNotFound',
      );
    });

    it('should fail when document is not owned by user', async () => {
      const otherUser = createTestUser();
      await ctx.db.insert(user).values({
        id: otherUser.id,
        email: otherUser.email,
        name: otherUser.name,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const doc = createTestDocument({ createdBy: otherUser.id });
      await ctx.db.insert(document).values(doc);

      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));

      await expectToFail(
        repo.verifyDocumentsExist([doc.id], testUser.id),
        PodcastRepoLive,
        ctx.dbLayer,
        'DocumentNotFound',
      );
    });
  });

  describe('updateGenerationContext', () => {
    it('should update generation context', async () => {
      const testPodcast = createTestPodcast({ createdBy: testUser.id });
      await ctx.db.insert(podcast).values(testPodcast);

      const generationContext = {
        systemPromptTemplate: 'You are a podcast host',
        userInstructions: 'Make it engaging',
        sourceDocuments: [{ id: 'doc-1', title: 'Test Document' }],
        modelId: 'gemini-2.0-flash',
        generatedAt: new Date().toISOString(),
      };

      const repo = await runEffect(Effect.map(PodcastRepo, (r) => r));
      const result = await runEffect(
        repo.updateGenerationContext(testPodcast.id, generationContext),
      );

      expect(result.generationContext).toEqual(generationContext);
    });
  });
});
