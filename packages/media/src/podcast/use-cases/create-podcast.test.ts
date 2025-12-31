import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Effect, Layer, Cause, Exit } from 'effect';
import { createPodcast } from './create-podcast';
import { PodcastRepoLive } from '../repos/podcast-repo';
import { ScriptVersionRepoLive } from '../repos/script-version-repo';
import {
  createTestContext,
  createTestDocument,
  createTestUser,
  resetAllFactories,
  type TestContext,
} from '@repo/testing';
import { document, user } from '@repo/db/schema';
import { DocumentNotFound } from '@repo/db/errors';

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

describe('createPodcast use case', () => {
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

  const repoLayers = Layer.mergeAll(PodcastRepoLive, ScriptVersionRepoLive);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runEffect = <A, E>(effect: Effect.Effect<A, E, any>): Promise<A> => {
    const provided = effect.pipe(
      Effect.provide(repoLayers),
      Effect.provide(ctx.dbLayer),
    ) as Effect.Effect<A, E, never>;
    return Effect.runPromise(provided);
  };

  describe('without documents', () => {
    it('should create a podcast with draft version', async () => {
      const result = await runEffect(
        createPodcast({
          format: 'conversation',
          title: 'Test Podcast',
          userId: testUser.id,
        }),
      );

      expect(result.title).toBe('Test Podcast');
      expect(result.format).toBe('conversation');
      expect(result.documents).toEqual([]);
      expect(result.activeVersion).not.toBeNull();
      expect(result.activeVersion?.status).toBe('draft');
      expect(result.activeVersion?.version).toBe(1);
    });

    it('should set voice and prompt settings on podcast', async () => {
      const result = await runEffect(
        createPodcast({
          format: 'conversation',
          hostVoice: 'voice-1',
          coHostVoice: 'voice-2',
          promptInstructions: 'Make it casual',
          userId: testUser.id,
        }),
      );

      // Voice and prompt settings are now on the podcast, not the version
      expect(result.hostVoice).toBe('voice-1');
      expect(result.coHostVoice).toBe('voice-2');
      expect(result.promptInstructions).toBe('Make it casual');
    });
  });

  describe('with documents', () => {
    it('should create podcast with linked documents', async () => {
      const doc1 = createTestDocument({ createdBy: testUser.id });
      const doc2 = createTestDocument({ createdBy: testUser.id });
      await ctx.db.insert(document).values([doc1, doc2]);

      const result = await runEffect(
        createPodcast({
          format: 'conversation',
          documentIds: [doc1.id, doc2.id],
          userId: testUser.id,
        }),
      );

      expect(result.documents).toHaveLength(2);
      expect(result.documents.map((d) => d.id)).toContain(doc1.id);
      expect(result.documents.map((d) => d.id)).toContain(doc2.id);
      // Documents are linked to podcast, not version
      expect(result.sourceDocumentIds).toEqual([doc1.id, doc2.id]);
    });

    it('should fail with DocumentNotFound for non-existent document', async () => {
      await expectEffectToFailWith(
        createPodcast({
          format: 'conversation',
          documentIds: [NON_EXISTENT_ID],
          userId: testUser.id,
        }),
        repoLayers,
        ctx.dbLayer,
        'DocumentNotFound',
      );
    });

    it('should fail with DocumentNotFound for document not owned by user', async () => {
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

      await expectEffectToFailWith(
        createPodcast({
          format: 'conversation',
          documentIds: [doc.id],
          userId: testUser.id,
        }),
        repoLayers,
        ctx.dbLayer,
        'DocumentNotFound',
      );
    });
  });

  describe('podcast format', () => {
    it('should support conversation format', async () => {
      const result = await runEffect(
        createPodcast({
          format: 'conversation',
          userId: testUser.id,
        }),
      );

      expect(result.format).toBe('conversation');
    });

    it('should support voice_over format', async () => {
      const result = await runEffect(
        createPodcast({
          format: 'voice_over',
          userId: testUser.id,
        }),
      );

      expect(result.format).toBe('voice_over');
    });
  });
});
