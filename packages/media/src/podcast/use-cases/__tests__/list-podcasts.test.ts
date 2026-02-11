import { withCurrentUser } from '@repo/auth/policy';
import { Db } from '@repo/db/effect';
import {
  createTestUser,
  createTestPodcast,
  resetPodcastCounters,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Podcast } from '@repo/db/schema';
import {
  PodcastRepo,
  type PodcastRepoService,
  type ListOptions,
} from '../../repos/podcast-repo';
import { listPodcasts } from '../list-podcasts';

// =============================================================================
// Mock PodcastRepo
// =============================================================================

interface MockRepoState {
  podcasts: Podcast[];
}

const createMockPodcastRepo = (state: MockRepoState): PodcastRepoService => ({
  insert: () => Effect.die('Not implemented in mock'),
  findById: () => Effect.die('Not implemented in mock'),
  update: () => Effect.die('Not implemented in mock'),
  delete: () => Effect.die('Not implemented in mock'),
  verifyDocumentsExist: () => Effect.die('Not implemented in mock'),
  updateGenerationContext: () => Effect.die('Not implemented in mock'),
  updateStatus: () => Effect.die('Not implemented in mock'),
  updateScript: () => Effect.die('Not implemented in mock'),
  updateAudio: () => Effect.die('Not implemented in mock'),
  clearAudio: () => Effect.die('Not implemented in mock'),
  clearApproval: () => Effect.die('Not implemented in mock'),
  setApproval: () => Effect.die('Not implemented in mock'),

  list: (options: ListOptions) =>
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
        ),
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
    it('returns paginated podcasts with status and duration', async () => {
      const user = createTestUser();
      const podcast1 = createTestPodcast({
        createdBy: user.id,
        status: 'ready',
        duration: 300,
      });
      const podcast2 = createTestPodcast({
        createdBy: user.id,
        status: 'drafting',
      });

      const mockRepoLayer = createMockPodcastRepoLayer({
        podcasts: [podcast1, podcast2],
      });

      const effect = withCurrentUser(user)(
        listPodcasts({}).pipe(
          Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
        ),
      );

      const result = await Effect.runPromise(effect);

      expect(result.podcasts).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);

      // Verify status and duration are directly on podcast
      const first = result.podcasts[0]!;
      expect(first.status).toBe('ready');
      expect(first.duration).toBe(300);
    });

    it('returns empty list when no podcasts exist', async () => {
      const user = createTestUser();

      const mockRepoLayer = createMockPodcastRepoLayer({
        podcasts: [],
      });

      const effect = withCurrentUser(user)(
        listPodcasts({}).pipe(
          Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
        ),
      );

      const result = await Effect.runPromise(effect);

      expect(result.podcasts).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('returns podcasts with drafting status by default', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });

      const mockRepoLayer = createMockPodcastRepoLayer({
        podcasts: [podcast],
      });

      const effect = withCurrentUser(user)(
        listPodcasts({}).pipe(
          Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
        ),
      );

      const result = await Effect.runPromise(effect);

      expect(result.podcasts).toHaveLength(1);
      expect(result.podcasts[0]!.status).toBe('drafting');
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
      });

      const effect = withCurrentUser(user)(
        listPodcasts({
          limit: 3,
          offset: 2,
        }).pipe(Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer))),
      );

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
      });

      const effect = withCurrentUser(user)(
        listPodcasts({
          limit: 5,
          offset: 5,
        }).pipe(Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer))),
      );

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
      });

      const effect = withCurrentUser(user)(
        listPodcasts({
          limit: 5,
          offset: 5,
        }).pipe(Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer))),
      );

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
      });

      const effect = withCurrentUser(user)(
        listPodcasts({}).pipe(
          Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
        ),
      );

      const result = await Effect.runPromise(effect);

      expect(result.podcasts).toHaveLength(50);
      expect(result.total).toBe(60);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('filtering', () => {
    it('filters by current user from FiberRef', async () => {
      const user1 = createTestUser();
      const user2 = createTestUser();
      const podcast1 = createTestPodcast({ createdBy: user1.id });
      const podcast2 = createTestPodcast({ createdBy: user2.id });

      const mockRepoLayer = createMockPodcastRepoLayer({
        podcasts: [podcast1, podcast2],
      });

      const effect = withCurrentUser(user1)(
        listPodcasts({}).pipe(
          Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
        ),
      );

      const result = await Effect.runPromise(effect);

      expect(result.podcasts).toHaveLength(1);
      expect(result.podcasts[0]!.id).toBe(podcast1.id);
      expect(result.total).toBe(1);
    });
  });
});
