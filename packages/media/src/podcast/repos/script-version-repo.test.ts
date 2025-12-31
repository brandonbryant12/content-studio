import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Effect, Layer, Cause, Exit } from 'effect';
import { ScriptVersionRepo, ScriptVersionRepoLive } from './script-version-repo';
import {
  createTestContext,
  createTestPodcast,
  createTestPodcastScript,
  createTestUser,
  resetAllFactories,
  type TestContext,
} from '@repo/testing';
import { podcast, podcastScript, user } from '@repo/db/schema';
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

describe('ScriptVersionRepo', () => {
  let ctx: TestContext;
  let testUser: ReturnType<typeof createTestUser>;
  let testPodcast: ReturnType<typeof createTestPodcast>;

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    testUser = createTestUser();
    testPodcast = createTestPodcast({ createdBy: testUser.id });

    // Insert test user and podcast
    await ctx.db.insert(user).values({
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await ctx.db.insert(podcast).values(testPodcast);
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  const runEffect = <A, E>(
    effect: Effect.Effect<A, E, ScriptVersionRepo | Db>,
  ): Promise<A> =>
    Effect.runPromise(
      effect.pipe(
        Effect.provide(ScriptVersionRepoLive),
        Effect.provide(ctx.dbLayer),
      ),
    );

  describe('insert', () => {
    it('should create first version as version 1', async () => {
      const repo = await runEffect(Effect.map(ScriptVersionRepo, (r) => r));

      const result = await runEffect(
        repo.insert({
          podcastId: testPodcast.id,
          status: 'drafting',
        }),
      );

      expect(result.version).toBe(1);
      expect(result.isActive).toBe(true);
      expect(result.status).toBe('drafting');
    });

    it('should auto-increment version number', async () => {
      const repo = await runEffect(Effect.map(ScriptVersionRepo, (r) => r));

      await runEffect(
        repo.insert({
          podcastId: testPodcast.id,
          status: 'drafting',
        }),
      );

      const result = await runEffect(
        repo.insert({
          podcastId: testPodcast.id,
          status: 'script_ready',
          segments: [{ speaker: 'host', line: 'Hello', index: 0 }],
        }),
      );

      expect(result.version).toBe(2);
    });

    it('should deactivate previous versions when inserting new one', async () => {
      const repo = await runEffect(Effect.map(ScriptVersionRepo, (r) => r));

      const v1 = await runEffect(
        repo.insert({
          podcastId: testPodcast.id,
          status: 'drafting',
        }),
      );

      await runEffect(
        repo.insert({
          podcastId: testPodcast.id,
          status: 'script_ready',
        }),
      );

      // Check that v1 is now inactive
      const v1Updated = await runEffect(repo.findById(v1.id));
      expect(v1Updated.isActive).toBe(false);
    });
  });

  describe('findById', () => {
    it('should find existing version', async () => {
      const script = createTestPodcastScript({ podcastId: testPodcast.id });
      await ctx.db.insert(podcastScript).values(script);

      const repo = await runEffect(Effect.map(ScriptVersionRepo, (r) => r));
      const result = await runEffect(repo.findById(script.id));

      expect(result.id).toBe(script.id);
      expect(result.podcastId).toBe(testPodcast.id);
    });

    it('should fail with ScriptNotFound for non-existent version', async () => {
      const repo = await runEffect(Effect.map(ScriptVersionRepo, (r) => r));

      await expectToFail(
        repo.findById(NON_EXISTENT_ID),
        ScriptVersionRepoLive,
        ctx.dbLayer,
        'ScriptNotFound',
      );
    });
  });

  describe('findActiveByPodcastId', () => {
    it('should find active version', async () => {
      const script = createTestPodcastScript({
        podcastId: testPodcast.id,
        isActive: true,
      });
      await ctx.db.insert(podcastScript).values(script);

      const repo = await runEffect(Effect.map(ScriptVersionRepo, (r) => r));
      const result = await runEffect(
        repo.findActiveByPodcastId(testPodcast.id),
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(script.id);
    });

    it('should return null when no active version exists', async () => {
      const script = createTestPodcastScript({
        podcastId: testPodcast.id,
        isActive: false,
      });
      await ctx.db.insert(podcastScript).values(script);

      const repo = await runEffect(Effect.map(ScriptVersionRepo, (r) => r));
      const result = await runEffect(
        repo.findActiveByPodcastId(testPodcast.id),
      );

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update version fields', async () => {
      const script = createTestPodcastScript({ podcastId: testPodcast.id });
      await ctx.db.insert(podcastScript).values(script);

      const repo = await runEffect(Effect.map(ScriptVersionRepo, (r) => r));
      const result = await runEffect(
        repo.update(script.id, {
          status: 'script_ready',
          segments: [{ speaker: 'host', line: 'Updated', index: 0 }],
        }),
      );

      expect(result.status).toBe('script_ready');
      expect(result.segments).toHaveLength(1);
    });

    it('should fail with ScriptNotFound for non-existent version', async () => {
      const repo = await runEffect(Effect.map(ScriptVersionRepo, (r) => r));

      await expectToFail(
        repo.update(NON_EXISTENT_ID, { status: 'script_ready' }),
        ScriptVersionRepoLive,
        ctx.dbLayer,
        'ScriptNotFound',
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status', async () => {
      const script = createTestPodcastScript({
        podcastId: testPodcast.id,
        status: 'drafting',
      });
      await ctx.db.insert(podcastScript).values(script);

      const repo = await runEffect(Effect.map(ScriptVersionRepo, (r) => r));
      const result = await runEffect(
        repo.updateStatus(script.id, 'generating_audio'),
      );

      expect(result.status).toBe('generating_audio');
    });

    it('should update status with error message', async () => {
      const script = createTestPodcastScript({
        podcastId: testPodcast.id,
        status: 'generating_audio',
      });
      await ctx.db.insert(podcastScript).values(script);

      const repo = await runEffect(Effect.map(ScriptVersionRepo, (r) => r));
      const result = await runEffect(
        repo.updateStatus(script.id, 'failed', 'Generation failed'),
      );

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Generation failed');
    });
  });

  describe('deactivateAll', () => {
    it('should deactivate all versions for a podcast', async () => {
      const script1 = createTestPodcastScript({
        podcastId: testPodcast.id,
        version: 1,
        isActive: true,
      });
      const script2 = createTestPodcastScript({
        podcastId: testPodcast.id,
        version: 2,
        isActive: false,
      });
      await ctx.db.insert(podcastScript).values([script1, script2]);

      const repo = await runEffect(Effect.map(ScriptVersionRepo, (r) => r));
      await runEffect(repo.deactivateAll(testPodcast.id));

      const result = await runEffect(
        repo.findActiveByPodcastId(testPodcast.id),
      );
      expect(result).toBeNull();
    });
  });

  describe('getNextVersion', () => {
    it('should return 1 for podcast with no versions', async () => {
      const repo = await runEffect(Effect.map(ScriptVersionRepo, (r) => r));
      const result = await runEffect(repo.getNextVersion(testPodcast.id));

      expect(result).toBe(1);
    });

    it('should return next version number', async () => {
      const script = createTestPodcastScript({
        podcastId: testPodcast.id,
        version: 3,
      });
      await ctx.db.insert(podcastScript).values(script);

      const repo = await runEffect(Effect.map(ScriptVersionRepo, (r) => r));
      const result = await runEffect(repo.getNextVersion(testPodcast.id));

      expect(result).toBe(4);
    });
  });
});
