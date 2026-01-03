import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestUser,
  createTestPodcast,
  createTestPodcastScript,
  resetPodcastCounters,
} from '@repo/testing';
import type { Podcast, PodcastScript } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import {
  PodcastRepo,
  type PodcastRepoService,
  type ListOptions,
  type PodcastWithActiveVersionSummary,
} from '../../repos/podcast-repo';
import { listPodcasts } from '../list-podcasts';

// =============================================================================
// Mock PodcastRepo
// =============================================================================

interface MockRepoState {
  podcasts: Podcast[];
  versions: PodcastScript[];
}

const createMockPodcastRepo = (state: MockRepoState): PodcastRepoService => ({
  insert: () => Effect.die('Not implemented in mock'),
  findById: () => Effect.die('Not implemented in mock'),
  findByIdFull: () => Effect.die('Not implemented in mock'),
  update: () => Effect.die('Not implemented in mock'),
  delete: () => Effect.die('Not implemented in mock'),
  list: () => Effect.die('Not implemented in mock'),
  verifyDocumentsExist: () => Effect.die('Not implemented in mock'),
  updateGenerationContext: () => Effect.die('Not implemented in mock'),

  listWithActiveVersionSummary: (options: ListOptions) =>
    Effect.succeed(
      state.podcasts
        .filter((pod) => {
          if (options.createdBy && pod.createdBy !== options.createdBy)
            return false;
          if (options.userId && pod.createdBy !== options.userId) return false;
          return true;
        })
        .slice(
          options.offset ?? 0,
          (options.offset ?? 0) + (options.limit ?? 50),
        )
        .map((pod): PodcastWithActiveVersionSummary => {
          const version = state.versions.find(
            (v) => v.podcastId === pod.id && v.isActive,
          );
          return {
            ...pod,
            activeVersion: version
              ? {
                  id: version.id,
                  version: version.version,
                  status: version.status,
                  duration: version.duration,
                }
              : null,
          };
        }),
    ),

  count: (options?: ListOptions) =>
    Effect.succeed(
      state.podcasts.filter((pod) => {
        if (options?.createdBy && pod.createdBy !== options.createdBy)
          return false;
        if (options?.userId && pod.createdBy !== options.userId) return false;
        return true;
      }).length,
    ),
});

const createMockPodcastRepoLayer = (
  state: MockRepoState,
): Layer.Layer<PodcastRepo> =>
  Layer.succeed(PodcastRepo, createMockPodcastRepo(state));

/**
 * Create a mock Db layer that won't actually be used since
 * our mock PodcastRepo methods return Effect.succeed directly.
 */
const MockDbLayer: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as any,
});

// =============================================================================
// Tests
// =============================================================================

describe('listPodcasts', () => {
  beforeEach(() => {
    resetPodcastCounters();
  });

  describe('basic listing', () => {
    it('returns paginated podcasts with active version summary', async () => {
      const user = createTestUser();
      const podcast1 = createTestPodcast({ createdBy: user.id });
      const podcast2 = createTestPodcast({ createdBy: user.id });
      const version1 = createTestPodcastScript({
        podcastId: podcast1.id,
        isActive: true,
        status: 'ready',
        duration: 300,
      });
      const version2 = createTestPodcastScript({
        podcastId: podcast2.id,
        isActive: true,
        status: 'drafting',
      });

      const mockRepoLayer = createMockPodcastRepoLayer({
        podcasts: [podcast1, podcast2],
        versions: [version1, version2],
      });

      const effect = listPodcasts({ userId: user.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
      );

      const result = await Effect.runPromise(effect);

      expect(result.podcasts).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);

      // Verify active version summary is included
      const first = result.podcasts[0]!;
      expect(first.activeVersion).not.toBeNull();
      expect(first.activeVersion?.status).toBe('ready');
      expect(first.activeVersion?.duration).toBe(300);
    });

    it('returns empty list when no podcasts exist', async () => {
      const user = createTestUser();

      const mockRepoLayer = createMockPodcastRepoLayer({
        podcasts: [],
        versions: [],
      });

      const effect = listPodcasts({ userId: user.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
      );

      const result = await Effect.runPromise(effect);

      expect(result.podcasts).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('returns podcasts with null activeVersion when no active version exists', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });

      const mockRepoLayer = createMockPodcastRepoLayer({
        podcasts: [podcast],
        versions: [], // No versions
      });

      const effect = listPodcasts({ userId: user.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
      );

      const result = await Effect.runPromise(effect);

      expect(result.podcasts).toHaveLength(1);
      expect(result.podcasts[0]!.activeVersion).toBeNull();
    });
  });

  describe('pagination', () => {
    it('respects limit and offset parameters', async () => {
      const user = createTestUser();
      const podcasts = Array.from({ length: 10 }, () =>
        createTestPodcast({ createdBy: user.id }),
      );

      const mockRepoLayer = createMockPodcastRepoLayer({
        podcasts,
        versions: [],
      });

      const effect = listPodcasts({
        userId: user.id,
        limit: 3,
        offset: 2,
      }).pipe(Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)));

      const result = await Effect.runPromise(effect);

      expect(result.podcasts).toHaveLength(3);
      expect(result.podcasts[0]!.id).toBe(podcasts[2]!.id);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('hasMore is true when there are more podcasts beyond offset+limit', async () => {
      const user = createTestUser();
      const podcasts = Array.from({ length: 15 }, () =>
        createTestPodcast({ createdBy: user.id }),
      );

      const mockRepoLayer = createMockPodcastRepoLayer({
        podcasts,
        versions: [],
      });

      const effect = listPodcasts({
        userId: user.id,
        limit: 5,
        offset: 5,
      }).pipe(Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)));

      const result = await Effect.runPromise(effect);

      expect(result.podcasts).toHaveLength(5);
      expect(result.total).toBe(15);
      // offset(5) + returned(5) = 10, total = 15, so hasMore = true
      expect(result.hasMore).toBe(true);
    });

    it('hasMore is false when at the end of the list', async () => {
      const user = createTestUser();
      const podcasts = Array.from({ length: 10 }, () =>
        createTestPodcast({ createdBy: user.id }),
      );

      const mockRepoLayer = createMockPodcastRepoLayer({
        podcasts,
        versions: [],
      });

      const effect = listPodcasts({
        userId: user.id,
        limit: 5,
        offset: 5,
      }).pipe(Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)));

      const result = await Effect.runPromise(effect);

      expect(result.podcasts).toHaveLength(5);
      expect(result.total).toBe(10);
      // offset(5) + returned(5) = 10, total = 10, so hasMore = false
      expect(result.hasMore).toBe(false);
    });

    it('uses default limit of 50 when not specified', async () => {
      const user = createTestUser();
      const podcasts = Array.from({ length: 60 }, () =>
        createTestPodcast({ createdBy: user.id }),
      );

      const mockRepoLayer = createMockPodcastRepoLayer({
        podcasts,
        versions: [],
      });

      const effect = listPodcasts({ userId: user.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
      );

      const result = await Effect.runPromise(effect);

      expect(result.podcasts).toHaveLength(50);
      expect(result.total).toBe(60);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('filtering', () => {
    it('filters by userId', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const podcast1 = createTestPodcast({ createdBy: user1.id });
      const podcast2 = createTestPodcast({ createdBy: user2.id });

      const mockRepoLayer = createMockPodcastRepoLayer({
        podcasts: [podcast1, podcast2],
        versions: [],
      });

      const effect = listPodcasts({ userId: user1.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
      );

      const result = await Effect.runPromise(effect);

      expect(result.podcasts).toHaveLength(1);
      expect(result.podcasts[0]!.id).toBe(podcast1.id);
      expect(result.total).toBe(1);
    });

    it('returns all podcasts when no filters specified', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const podcast1 = createTestPodcast({ createdBy: user1.id });
      const podcast2 = createTestPodcast({ createdBy: user2.id });

      const mockRepoLayer = createMockPodcastRepoLayer({
        podcasts: [podcast1, podcast2],
        versions: [],
      });

      const effect = listPodcasts({}).pipe(
        Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
      );

      const result = await Effect.runPromise(effect);

      expect(result.podcasts).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });
});
