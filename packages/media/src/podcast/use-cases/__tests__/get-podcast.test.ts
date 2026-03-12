import { Db } from '@repo/db/effect';
import {
  createTestAdmin,
  createTestUser,
  createTestPodcast,
  createTestSource,
  resetPodcastCounters,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Podcast, Source } from '@repo/db/schema';
import { PodcastNotFound } from '../../../errors';
import {
  PodcastRepo,
  type PodcastRepoService,
  type PodcastWithSources,
} from '../../repos/podcast-repo';
import { getPodcast } from '../get-podcast';

// =============================================================================
// Test Setup
// =============================================================================

interface MockRepoState {
  podcasts: Podcast[];
  sources: Source[];
}

/**
 * Create a mock PodcastRepo layer with custom behavior.
 */
const createMockPodcastRepo = (
  state: MockRepoState,
): Layer.Layer<PodcastRepo> => {
  const service: PodcastRepoService = {
    insert: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    verifySourcesExist: () => Effect.die('not implemented'),
    updateGenerationContext: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateScript: () => Effect.die('not implemented'),
    updateAudio: () => Effect.die('not implemented'),
    clearAudio: () => Effect.die('not implemented'),
    clearApproval: () => Effect.die('not implemented'),
    setApproval: () => Effect.die('not implemented'),

    findByIdForUser: (id: string, userId: string) =>
      Effect.suspend(() => {
        const podcast = state.podcasts.find(
          (p) => p.id === id && p.createdBy === userId,
        );
        if (!podcast) {
          return Effect.fail(new PodcastNotFound({ id }));
        }
        const docs = state.sources.filter((d) =>
          podcast.sourceIds.includes(d.id),
        );
        const result: PodcastWithSources = {
          ...podcast,
          sources: docs,
        };
        return Effect.succeed(result);
      }),
    findById: (id: string) =>
      Effect.suspend(() => {
        const podcast = state.podcasts.find((p) => p.id === id);
        if (!podcast) {
          return Effect.fail(new PodcastNotFound({ id }));
        }
        const docs = state.sources.filter((d) =>
          podcast.sourceIds.includes(d.id),
        );
        const result: PodcastWithSources = {
          ...podcast,
          sources: docs,
        };
        return Effect.succeed(result);
      }),
  };

  return Layer.succeed(PodcastRepo, service);
};

/**
 * Create a mock Db layer (required by use case signature but not used when repo is mocked).
 */
const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as never,
});

// =============================================================================
// Tests
// =============================================================================

describe('getPodcast', () => {
  beforeEach(() => {
    resetPodcastCounters();
    resetAllFactories();
  });

  describe('basic retrieval', () => {
    it('returns podcast with sources when found', async () => {
      const user = createTestUser();
      const doc = createTestSource({ createdBy: user.id });
      const podcast = createTestPodcast({
        title: 'My Podcast',
        createdBy: user.id,
        sourceIds: [doc.id],
      });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        sources: [doc],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          getPodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.id).toBe(podcast.id);
      expect(result.title).toBe('My Podcast');
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]!.id).toBe(doc.id);
    });

    it('returns podcast without sources by default', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        status: 'ready',
      });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        sources: [],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          getPodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.id).toBe(podcast.id);
      expect(result.status).toBe('ready');
    });

    it('returns podcast with sources when includeSources is true', async () => {
      const user = createTestUser();
      const doc = createTestSource({ createdBy: user.id });
      const podcast = createTestPodcast({
        createdBy: user.id,
        sourceIds: [doc.id],
        status: 'ready',
      });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        sources: [doc],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          getPodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.id).toBe(podcast.id);
      expect(result.status).toBe('ready');
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]!.id).toBe(doc.id);
    });

    it('returns podcast with status from the podcast directly', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        status: 'generating_script',
      });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        sources: [],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          getPodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.id).toBe(podcast.id);
      expect(result.status).toBe('generating_script');
    });

    it('fails with PodcastNotFound when admin has no explicit target for another user podcast', async () => {
      const admin = createTestAdmin({ id: 'admin-1' });
      const owner = createTestUser({ id: 'member-1' });
      const doc = createTestSource({ createdBy: owner.id });
      const podcast = createTestPodcast({
        title: 'Admin Visible Podcast',
        createdBy: owner.id,
        sourceIds: [doc.id],
      });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        sources: [doc],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        withTestUser(admin)(
          getPodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('PodcastNotFound');
      }
    });

    it('allows admins to access another user podcast when userId is provided', async () => {
      const admin = createTestAdmin({ id: 'admin-1' });
      const owner = createTestUser({ id: 'member-1' });
      const doc = createTestSource({ createdBy: owner.id });
      const podcast = createTestPodcast({
        title: 'Admin Visible Podcast',
        createdBy: owner.id,
        sourceIds: [doc.id],
      });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        sources: [doc],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(admin)(
          getPodcast({ podcastId: podcast.id, userId: owner.id }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(result.id).toBe(podcast.id);
      expect(result.createdBy).toBe(owner.id);
      expect(result.sources[0]?.id).toBe(doc.id);
    });
  });

  describe('sources resolution', () => {
    it('returns podcast with multiple sources in order', async () => {
      const user = createTestUser();
      const doc1 = createTestSource({ createdBy: user.id, title: 'Doc 1' });
      const doc2 = createTestSource({ createdBy: user.id, title: 'Doc 2' });
      const doc3 = createTestSource({ createdBy: user.id, title: 'Doc 3' });
      const podcast = createTestPodcast({
        createdBy: user.id,
        sourceIds: [doc1.id, doc2.id, doc3.id],
      });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        sources: [doc1, doc2, doc3],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          getPodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.sources).toHaveLength(3);
    });

    it('returns podcast with empty sources array when no sources', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        sourceIds: [],
      });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        sources: [],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          getPodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.sources).toHaveLength(0);
    });
  });

  describe('authorization', () => {
    it('fails with PodcastNotFound when non-owner tries to access', async () => {
      const owner = createTestUser();
      const nonOwner = createTestUser();
      const podcast = createTestPodcast({ createdBy: owner.id });

      const mockRepo = createMockPodcastRepo({
        podcasts: [podcast],
        sources: [],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        withTestUser(nonOwner)(
          getPodcast({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('PodcastNotFound');
        expect((error as PodcastNotFound).id).toBe(podcast.id);
      }
    });
  });

  describe('error handling', () => {
    it('fails with PodcastNotFound when podcast does not exist', async () => {
      const user = createTestUser();
      const nonExistentId = 'pod_nonexistent';

      const mockRepo = createMockPodcastRepo({
        podcasts: [],
        sources: [],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          getPodcast({ podcastId: nonExistentId }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('PodcastNotFound');
        expect((error as PodcastNotFound).id).toBe(nonExistentId);
      }
    });

    it('fails with PodcastNotFound when includeSources is true and podcast does not exist', async () => {
      const user = createTestUser();
      const nonExistentId = 'pod_nonexistent';

      const mockRepo = createMockPodcastRepo({
        podcasts: [],
        sources: [],
      });
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          getPodcast({ podcastId: nonExistentId }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('PodcastNotFound');
      }
    });
  });
});
