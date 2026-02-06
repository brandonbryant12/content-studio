import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTestUser,
  createTestPodcast,
  createTestCollaborator,
  resetAllFactories,
} from '@repo/testing';
import type {
  Podcast,
  Collaborator,
  PodcastId,
  CollaboratorId,
} from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import { withCurrentUser, Role } from '@repo/auth/policy';
import { ForbiddenError } from '@repo/db/errors';
import { CollaboratorNotFound, PodcastNotFound } from '../../../errors';
import {
  PodcastRepo,
  type PodcastRepoService,
  type PodcastWithDocuments,
} from '../../repos/podcast-repo';
import {
  CollaboratorRepo,
  type CollaboratorRepoService,
} from '../../repos/collaborator-repo';
import { removeCollaborator } from '../remove-collaborator';

// =============================================================================
// Test Setup
// =============================================================================

interface MockState {
  podcasts: Podcast[];
  collaborators: Collaborator[];
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
    clearApprovals: () => Effect.die('not implemented'),
    setOwnerApproval: () => Effect.die('not implemented'),

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
  };

  return Layer.succeed(PodcastRepo, service);
};

const createMockCollaboratorRepo = (
  state: MockState,
  options?: {
    onRemove?: (id: CollaboratorId) => void;
  },
): Layer.Layer<CollaboratorRepo> => {
  const service: CollaboratorRepoService = {
    findByPodcast: () => Effect.die('not implemented'),
    findByEmail: () => Effect.die('not implemented'),
    findByPodcastAndUser: () => Effect.die('not implemented'),
    findByPodcastAndEmail: () => Effect.die('not implemented'),
    lookupUserByEmail: () => Effect.die('not implemented'),
    add: () => Effect.die('not implemented'),
    approve: () => Effect.die('not implemented'),
    revokeApproval: () => Effect.die('not implemented'),
    clearAllApprovals: () => Effect.die('not implemented'),
    claimByEmail: () => Effect.die('not implemented'),

    findById: (id: CollaboratorId) =>
      Effect.sync(() => {
        const collaborator = state.collaborators.find((c) => c.id === id);
        return collaborator ?? null;
      }),

    remove: (id: CollaboratorId) =>
      Effect.sync(() => {
        options?.onRemove?.(id);
        const index = state.collaborators.findIndex((c) => c.id === id);
        if (index >= 0) {
          state.collaborators.splice(index, 1);
          return true;
        }
        return false;
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

describe('removeCollaborator', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('success cases', () => {
    it('removes collaborator when owner removes', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const ownerUser = {
        id: owner.id,
        email: owner.email,
        name: owner.name,
        role: Role.USER,
      };
      const podcast = createTestPodcast({
        id: 'pod_test0000000001' as PodcastId,
        createdBy: owner.id,
      });
      const collaborator = createTestCollaborator({
        podcastId: podcast.id,
        email: 'collaborator@example.com',
      });

      const state: MockState = {
        podcasts: [podcast],
        collaborators: [collaborator],
      };

      const removeSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(state),
        createMockCollaboratorRepo(state, { onRemove: removeSpy }),
      );

      await Effect.runPromise(
        withCurrentUser(ownerUser)(
          removeCollaborator({
            collaboratorId: collaborator.id,
          }),
        ).pipe(Effect.provide(layers)),
      );

      expect(removeSpy).toHaveBeenCalledWith(collaborator.id);
      expect(state.collaborators).toHaveLength(0);
    });
  });

  describe('error cases', () => {
    it('fails with ForbiddenError when non-owner tries to remove', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const nonOwner = createTestUser({ id: 'non-owner-id' });
      const nonOwnerUser = {
        id: nonOwner.id,
        email: nonOwner.email,
        name: nonOwner.name,
        role: Role.USER,
      };
      const podcast = createTestPodcast({
        id: 'pod_test0000000001' as PodcastId,
        createdBy: owner.id,
      });
      const collaborator = createTestCollaborator({
        podcastId: podcast.id,
        email: 'collaborator@example.com',
      });

      const state: MockState = {
        podcasts: [podcast],
        collaborators: [collaborator],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(state),
        createMockCollaboratorRepo(state),
      );

      const result = await Effect.runPromiseExit(
        withCurrentUser(nonOwnerUser)(
          removeCollaborator({
            collaboratorId: collaborator.id,
          }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(ForbiddenError);
      }
    });

    it('fails with CollaboratorNotFound when collaborator does not exist', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const ownerUser = {
        id: owner.id,
        email: owner.email,
        name: owner.name,
        role: Role.USER,
      };
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
        withCurrentUser(ownerUser)(
          removeCollaborator({
            collaboratorId: 'col_nonexistent0000' as string,
          }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(CollaboratorNotFound);
      }
    });
  });
});
