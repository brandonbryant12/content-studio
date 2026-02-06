import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTestUser,
  createTestPodcast,
  createTestCollaborator,
  resetAllFactories,
} from '@repo/testing';
import type { Podcast, Collaborator, PodcastId } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import { NotPodcastCollaborator, PodcastNotFound } from '../../../errors';
import {
  PodcastRepo,
  type PodcastRepoService,
  type PodcastWithDocuments,
} from '../../repos/podcast-repo';
import {
  CollaboratorRepo,
  type CollaboratorRepoService,
} from '../../repos/collaborator-repo';
import { approvePodcast } from '../approve-podcast';

// =============================================================================
// Test Setup
// =============================================================================

interface MockState {
  podcasts: Podcast[];
  collaborators: Collaborator[];
}

const createMockPodcastRepo = (
  state: MockState,
  options?: {
    onSetOwnerApproval?: (id: string, hasApproved: boolean) => void;
  },
): Layer.Layer<PodcastRepo> => {
  const service: PodcastRepoService = {
    insert: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    verifyDocumentsExist: () => Effect.die('not implemented'),
    updateGenerationContext: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateScript: () => Effect.die('not implemented'),
    updateAudio: () => Effect.die('not implemented'),
    clearAudio: () => Effect.die('not implemented'),
    clearApprovals: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),

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

    setOwnerApproval: (id: string, hasApproved: boolean) =>
      Effect.sync(() => {
        options?.onSetOwnerApproval?.(id, hasApproved);
        const podcast = state.podcasts.find((p) => p.id === id);
        return { ...podcast!, ownerHasApproved: hasApproved };
      }),
  };

  return Layer.succeed(PodcastRepo, service);
};

const createMockCollaboratorRepo = (
  state: MockState,
  options?: {
    onApprove?: (podcastId: PodcastId, userId: string) => void;
  },
): Layer.Layer<CollaboratorRepo> => {
  const service: CollaboratorRepoService = {
    findById: () => Effect.die('not implemented'),
    findByPodcast: () => Effect.die('not implemented'),
    findByEmail: () => Effect.die('not implemented'),
    findByPodcastAndEmail: () => Effect.die('not implemented'),
    lookupUserByEmail: () => Effect.die('not implemented'),
    add: () => Effect.die('not implemented'),
    remove: () => Effect.die('not implemented'),
    revokeApproval: () => Effect.die('not implemented'),
    clearAllApprovals: () => Effect.die('not implemented'),
    claimByEmail: () => Effect.die('not implemented'),

    findByPodcastAndUser: (podcastId: PodcastId, userId: string) =>
      Effect.sync(() => {
        const collaborator = state.collaborators.find(
          (c) => c.podcastId === podcastId && c.userId === userId,
        );
        return collaborator ?? null;
      }),

    approve: (podcastId: PodcastId, userId: string) =>
      Effect.sync(() => {
        options?.onApprove?.(podcastId, userId);
        const collaborator = state.collaborators.find(
          (c) => c.podcastId === podcastId && c.userId === userId,
        );
        if (collaborator) {
          collaborator.hasApproved = true;
          collaborator.approvedAt = new Date();
          return collaborator;
        }
        return null;
      }),
  };

  return Layer.succeed(CollaboratorRepo, service);
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

  describe('owner approval', () => {
    it('sets ownerHasApproved when owner approves', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const podcast = createTestPodcast({
        id: 'pod_test0000000001' as PodcastId,
        createdBy: owner.id,
        ownerHasApproved: false,
      });

      const state: MockState = {
        podcasts: [podcast],
        collaborators: [],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(state),
        createMockCollaboratorRepo(state),
      );

      const result = await Effect.runPromise(
        approvePodcast({
          podcastId: podcast.id,
          userId: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.isOwner).toBe(true);
      expect(result.podcast).toBeDefined();
    });
  });

  describe('collaborator approval', () => {
    it('sets hasApproved when collaborator approves', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const collaboratorUser = createTestUser({ id: 'collab-id' });
      const podcast = createTestPodcast({
        id: 'pod_test0000000001' as PodcastId,
        createdBy: owner.id,
      });
      const collaborator = createTestCollaborator({
        podcastId: podcast.id,
        userId: collaboratorUser.id,
        email: 'collaborator@example.com',
        hasApproved: false,
      });

      const state: MockState = {
        podcasts: [podcast],
        collaborators: [collaborator],
      };

      const approveSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(state),
        createMockCollaboratorRepo(state, { onApprove: approveSpy }),
      );

      const result = await Effect.runPromise(
        approvePodcast({
          podcastId: podcast.id,
          userId: collaboratorUser.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.isOwner).toBe(false);
      expect(approveSpy).toHaveBeenCalledWith(podcast.id, collaboratorUser.id);
    });
  });

  describe('error cases', () => {
    it('fails with NotPodcastCollaborator when user is neither owner nor collaborator', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const stranger = createTestUser({ id: 'stranger-id' });
      const podcast = createTestPodcast({
        id: 'pod_test0000000001' as PodcastId,
        createdBy: owner.id,
      });

      const state: MockState = {
        podcasts: [podcast],
        collaborators: [],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(state),
        createMockCollaboratorRepo(state),
      );

      const result = await Effect.runPromiseExit(
        approvePodcast({
          podcastId: podcast.id,
          userId: stranger.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(NotPodcastCollaborator);
      }
    });

    it('fails with PodcastNotFound when podcast does not exist', async () => {
      const user = createTestUser({ id: 'user-id' });

      const state: MockState = {
        podcasts: [],
        collaborators: [],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(state),
        createMockCollaboratorRepo(state),
      );

      const result = await Effect.runPromiseExit(
        approvePodcast({
          podcastId: 'pod_nonexistent0000' as string,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(PodcastNotFound);
      }
    });
  });
});
