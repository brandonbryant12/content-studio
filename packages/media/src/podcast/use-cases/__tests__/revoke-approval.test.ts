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
import { ForbiddenError } from '@repo/db/errors';
import { PodcastNotFound } from '../../../errors';
import {
  PodcastRepo,
  type PodcastRepoService,
  type PodcastWithDocuments,
} from '../../repos/podcast-repo';
import { revokeApproval } from '../revoke-approval';

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
    setApproval: () => Effect.die('not implemented'),

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

    clearApproval: (id: string) =>
      Effect.suspend(() => {
        const podcast = state.podcasts.find((p) => p.id === id);
        if (!podcast) {
          return Effect.fail(new PodcastNotFound({ id }));
        }
        const updated = {
          ...podcast,
          approvedBy: null,
          approvedAt: null,
        };
        // Update in-place
        const index = state.podcasts.findIndex((p) => p.id === id);
        state.podcasts[index] = updated;
        return Effect.succeed(updated);
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

describe('revokeApproval', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('admin revoke', () => {
    it('clears approval when admin revokes', async () => {
      const admin = createTestAdmin({ id: 'admin-user-id' });
      const owner = createTestUser({ id: 'owner-id' });
      const podcast = createTestPodcast({
        id: 'pod_test0000000001' as PodcastId,
        createdBy: owner.id,
        approvedBy: 'admin-user-id',
        approvedAt: new Date(),
      });

      const state: MockState = {
        podcasts: [podcast],
      };

      const layers = Layer.mergeAll(MockDbLive, createMockPodcastRepo(state));

      const result = await Effect.runPromise(
        withTestUser(admin)(
          revokeApproval({ podcastId: podcast.id }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(result.podcast).toBeDefined();
      expect(result.podcast.approvedBy).toBeNull();
      expect(result.podcast.approvedAt).toBeNull();
    });
  });

  describe('error cases', () => {
    it('fails with ForbiddenError when non-admin tries to revoke', async () => {
      const regularUser = createTestUser({ id: 'regular-user-id' });
      const podcast = createTestPodcast({
        id: 'pod_test0000000001' as PodcastId,
        createdBy: regularUser.id,
        approvedBy: 'admin-user-id',
        approvedAt: new Date(),
      });

      const state: MockState = {
        podcasts: [podcast],
      };

      const layers = Layer.mergeAll(MockDbLive, createMockPodcastRepo(state));

      const result = await Effect.runPromiseExit(
        withTestUser(regularUser)(
          revokeApproval({ podcastId: podcast.id }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(ForbiddenError);
      }
    });

    it('fails with PodcastNotFound when podcast does not exist', async () => {
      const admin = createTestAdmin({ id: 'admin-user-id' });

      const state: MockState = {
        podcasts: [],
      };

      const layers = Layer.mergeAll(MockDbLive, createMockPodcastRepo(state));

      const result = await Effect.runPromiseExit(
        withTestUser(admin)(
          revokeApproval({
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
