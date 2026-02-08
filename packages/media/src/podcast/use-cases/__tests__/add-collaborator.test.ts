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
  CollaboratorWithUser,
  PodcastId,
} from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import {
  NotPodcastOwner,
  CollaboratorAlreadyExists,
  CannotAddOwnerAsCollaborator,
  PodcastNotFound,
} from '../../../errors';
import {
  PodcastRepo,
  type PodcastRepoService,
  type PodcastWithDocuments,
} from '../../repos/podcast-repo';
import {
  CollaboratorRepo,
  type CollaboratorRepoService,
} from '../../repos/collaborator-repo';
import { addCollaborator } from '../add-collaborator';

// =============================================================================
// Test Setup
// =============================================================================

interface TestUserInfo {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

interface MockState {
  podcasts: Podcast[];
  collaborators: Collaborator[];
  users: TestUserInfo[];
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
    onAdd?: (data: {
      podcastId: PodcastId;
      email: string;
      userId?: string;
      addedBy: string;
    }) => void;
  },
): Layer.Layer<CollaboratorRepo> => {
  const service: CollaboratorRepoService = {
    findById: () => Effect.die('not implemented'),
    findByPodcast: () => Effect.die('not implemented'),
    findByEmail: () => Effect.die('not implemented'),
    findByPodcastAndUser: () => Effect.die('not implemented'),
    remove: () => Effect.die('not implemented'),
    approve: () => Effect.die('not implemented'),
    revokeApproval: () => Effect.die('not implemented'),
    clearAllApprovals: () => Effect.die('not implemented'),
    claimByEmail: () => Effect.die('not implemented'),

    findByPodcastAndEmail: (podcastId: PodcastId, email: string) =>
      Effect.sync(() => {
        const collaborator = state.collaborators.find(
          (c) => c.podcastId === podcastId && c.email === email,
        );
        return collaborator ?? null;
      }),

    lookupUserByEmail: (email: string) =>
      Effect.sync(() => {
        const userInfo = state.users.find((u) => u.email === email);
        return userInfo ?? null;
      }),

    add: (data) =>
      Effect.sync(() => {
        options?.onAdd?.(data);
        const collaborator = createTestCollaborator({
          podcastId: data.podcastId,
          email: data.email,
          userId: data.userId ?? null,
          addedBy: data.addedBy,
        });
        state.collaborators.push(collaborator);
        return collaborator;
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

describe('addCollaborator', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('success cases', () => {
    it('adds collaborator with existing user', async () => {
      const owner = createTestUser({
        id: 'owner-id',
        email: 'owner@example.com',
      });
      const collaboratorUser = createTestUser({
        id: 'collab-id',
        email: 'collaborator@example.com',
        name: 'Collaborator',
      });
      const podcast = createTestPodcast({
        id: 'pod_test0000000001' as PodcastId,
        createdBy: owner.id,
      });

      const state: MockState = {
        podcasts: [podcast],
        collaborators: [],
        users: [
          { id: owner.id, email: owner.email, name: owner.name, image: null },
          {
            id: collaboratorUser.id,
            email: collaboratorUser.email,
            name: collaboratorUser.name,
            image: null,
          },
        ],
      };

      const addSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(state),
        createMockCollaboratorRepo(state, { onAdd: addSpy }),
      );

      const result = await Effect.runPromise(
        addCollaborator({
          podcastId: podcast.id,
          email: collaboratorUser.email,
          addedBy: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.collaborator).toBeDefined();
      expect(result.collaborator.email).toBe(collaboratorUser.email);
      expect(addSpy).toHaveBeenCalledOnce();
    });

    it('adds pending collaborator for unregistered email', async () => {
      const owner = createTestUser({
        id: 'owner-id',
        email: 'owner@example.com',
      });
      const podcast = createTestPodcast({
        id: 'pod_test0000000001' as PodcastId,
        createdBy: owner.id,
      });

      const state: MockState = {
        podcasts: [podcast],
        collaborators: [],
        users: [
          { id: owner.id, email: owner.email, name: owner.name, image: null },
        ],
      };

      const addSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(state),
        createMockCollaboratorRepo(state, { onAdd: addSpy }),
      );

      const result = await Effect.runPromise(
        addCollaborator({
          podcastId: podcast.id,
          email: 'newuser@example.com',
          addedBy: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.collaborator).toBeDefined();
      expect(result.collaborator.email).toBe('newuser@example.com');
      // userId should be undefined for pending invites
      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
        }),
      );
    });
  });

  describe('error cases', () => {
    it('fails with NotPodcastOwner when non-owner tries to add', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const nonOwner = createTestUser({ id: 'non-owner-id' });
      const podcast = createTestPodcast({
        id: 'pod_test0000000001' as PodcastId,
        createdBy: owner.id,
      });

      const state: MockState = {
        podcasts: [podcast],
        collaborators: [],
        users: [
          { id: owner.id, email: owner.email, name: owner.name, image: null },
          {
            id: nonOwner.id,
            email: nonOwner.email,
            name: nonOwner.name,
            image: null,
          },
        ],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(state),
        createMockCollaboratorRepo(state),
      );

      const result = await Effect.runPromiseExit(
        addCollaborator({
          podcastId: podcast.id,
          email: 'someone@example.com',
          addedBy: nonOwner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(NotPodcastOwner);
      }
    });

    it('fails with CollaboratorAlreadyExists when email already invited', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const podcast = createTestPodcast({
        id: 'pod_test0000000001' as PodcastId,
        createdBy: owner.id,
      });
      const existingCollaborator = createTestCollaborator({
        podcastId: podcast.id,
        email: 'existing@example.com',
      });

      const state: MockState = {
        podcasts: [podcast],
        collaborators: [existingCollaborator],
        users: [
          { id: owner.id, email: owner.email, name: owner.name, image: null },
        ],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(state),
        createMockCollaboratorRepo(state),
      );

      const result = await Effect.runPromiseExit(
        addCollaborator({
          podcastId: podcast.id,
          email: 'existing@example.com',
          addedBy: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(CollaboratorAlreadyExists);
      }
    });

    it('fails with PodcastNotFound when podcast does not exist', async () => {
      const owner = createTestUser({ id: 'owner-id' });

      const state: MockState = {
        podcasts: [],
        collaborators: [],
        users: [
          { id: owner.id, email: owner.email, name: owner.name, image: null },
        ],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(state),
        createMockCollaboratorRepo(state),
      );

      const result = await Effect.runPromiseExit(
        addCollaborator({
          podcastId: 'pod_nonexistent00000' as string,
          email: 'someone@example.com',
          addedBy: owner.id,
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
