import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestUser,
  createTestAdmin,
  createTestPodcast,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import type { Podcast, PodcastId } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import { ForbiddenError } from '@repo/auth';
import { PodcastNotFound } from '../../../errors';
import {
  PodcastRepo,
  type PodcastRepoService,
  type PodcastWithDocuments,
} from '../../repos/podcast-repo';
import { approvePodcast } from '../approve-podcast';

// =============================================================================
// Test Setup
// =============================================================================

interface MockState {
  podcasts: Podcast[];
}

const createMockPodcastRepo = (state: MockState): Layer.Layer<PodcastRepo> => {
  const service: PodcastRepoService = {
    insert: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    verifyDocumentsExist: () => Effect.die('not implemented'),
    updateGenerationContext: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateScript: () => Effect.die('not implemented'),
    updateAudio: () => Effect.die('not implemented'),
    clearAudio: () => Effect.die('not implemented'),
    clearApproval: () => Effect.die('not implemented'),

    findById: (id: string) =>
      Effect.suspend(() => {
        const podcast = state.podcasts.find((p) => p.id === id);
        if (!podcast) {
          return Effect.fail(new PodcastNotFound({ id }));
        }
        const result: PodcastWithDocuments = {
          ...podcast,
          documents: [],
        };
        return Effect.succeed(result);
      }),

    setApproval: (id: string, approvedBy: string) =>
      Effect.suspend(() => {
        const podcast = state.podcasts.find((p) => p.id === id);
        if (!podcast) {
          return Effect.fail(new PodcastNotFound({ id }));
        }
        return Effect.succeed({
          ...podcast,
          approvedBy,
          approvedAt: new Date(),
        });
      }),
  };

  return Layer.succeed(PodcastRepo, service);
};

const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as never,
});

// =============================================================================
// Tests
// =============================================================================

describe('approvePodcast', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('admin approval', () => {
    it('admin can approve a podcast', async () => {
      const admin = createTestAdmin({ id: 'admin-id' });
      const owner = createTestUser({ id: 'owner-id' });
      const podcast = createTestPodcast({
        id: 'pod_test0000000001' as PodcastId,
        createdBy: owner.id,
      });

      const state: MockState = {
        podcasts: [podcast],
      };

      const layers = Layer.mergeAll(MockDbLive, createMockPodcastRepo(state));

      const result = await Effect.runPromise(
        withTestUser(admin)(
          approvePodcast({
            podcastId: podcast.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.podcast).toBeDefined();
      expect(result.podcast.approvedBy).toBe(admin.id);
    });

    it('idempotent re-approval works', async () => {
      const admin = createTestAdmin({ id: 'admin-id' });
      const owner = createTestUser({ id: 'owner-id' });
      const podcast = createTestPodcast({
        id: 'pod_test0000000001' as PodcastId,
        createdBy: owner.id,
        approvedBy: admin.id,
        approvedAt: new Date(),
      });

      const state: MockState = {
        podcasts: [podcast],
      };

      const layers = Layer.mergeAll(MockDbLive, createMockPodcastRepo(state));

      const result = await Effect.runPromise(
        withTestUser(admin)(
          approvePodcast({
            podcastId: podcast.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.podcast).toBeDefined();
      expect(result.podcast.approvedBy).toBe(admin.id);
    });
  });

  describe('error cases', () => {
    it('non-admin gets ForbiddenError', async () => {
      const regularUser = createTestUser({ id: 'user-id' });
      const podcast = createTestPodcast({
        id: 'pod_test0000000001' as PodcastId,
        createdBy: regularUser.id,
      });

      const state: MockState = {
        podcasts: [podcast],
      };

      const layers = Layer.mergeAll(MockDbLive, createMockPodcastRepo(state));

      const result = await Effect.runPromiseExit(
        withTestUser(regularUser)(
          approvePodcast({
            podcastId: podcast.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(ForbiddenError);
      }
    });

    it('non-existent podcast gets PodcastNotFound', async () => {
      const admin = createTestAdmin({ id: 'admin-id' });

      const state: MockState = {
        podcasts: [],
      };

      const layers = Layer.mergeAll(MockDbLive, createMockPodcastRepo(state));

      const result = await Effect.runPromiseExit(
        withTestUser(admin)(
          approvePodcast({
            podcastId: 'pod_nonexistent0000' as string,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(PodcastNotFound);
      }
    });
  });
});
