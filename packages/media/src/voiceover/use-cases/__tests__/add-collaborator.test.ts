import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestUser, resetAllFactories } from '@repo/testing';
import type {
  Voiceover,
  VoiceoverCollaborator,
  VoiceoverId,
} from '@repo/db/schema';
import {
  generateVoiceoverId,
  generateVoiceoverCollaboratorId,
} from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import {
  NotVoiceoverOwner,
  VoiceoverCollaboratorAlreadyExists,
  CannotAddOwnerAsVoiceoverCollaborator,
  VoiceoverNotFound,
} from '../../../errors';
import {
  VoiceoverRepo,
  type VoiceoverRepoService,
} from '../../repos/voiceover-repo';
import {
  VoiceoverCollaboratorRepo,
  type VoiceoverCollaboratorRepoService,
} from '../../repos/voiceover-collaborator-repo';
import { addVoiceoverCollaborator } from '../add-collaborator';

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
  voiceovers: Voiceover[];
  collaborators: VoiceoverCollaborator[];
  users: TestUserInfo[];
}

/**
 * Create a test voiceover with default values.
 */
const createTestVoiceover = (
  options: Partial<Voiceover> & { id?: VoiceoverId; createdBy: string },
): Voiceover => {
  const now = new Date();
  return {
    id: options.id ?? generateVoiceoverId(),
    title: options.title ?? 'Test Voiceover',
    text: options.text ?? 'Test voiceover text',
    voice: options.voice ?? 'Charon',
    voiceName: options.voiceName ?? null,
    audioUrl: options.audioUrl ?? null,
    duration: options.duration ?? null,
    status: options.status ?? 'drafting',
    errorMessage: options.errorMessage ?? null,
    approvedBy: options.approvedBy ?? null,
    approvedAt: options.approvedAt ?? null,
    createdBy: options.createdBy,
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
};

/**
 * Create a test voiceover collaborator with default values.
 */
const createTestVoiceoverCollaborator = (
  options: Partial<VoiceoverCollaborator> & {
    voiceoverId: VoiceoverId;
    email: string;
    addedBy: string;
  },
): VoiceoverCollaborator => {
  const now = new Date();
  return {
    id: options.id ?? generateVoiceoverCollaboratorId(),
    voiceoverId: options.voiceoverId,
    userId: options.userId ?? null,
    email: options.email,
    addedAt: options.addedAt ?? now,
    addedBy: options.addedBy,
  };
};

const createMockVoiceoverRepo = (
  state: MockState,
): Layer.Layer<VoiceoverRepo> => {
  const service: VoiceoverRepoService = {
    insert: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateAudio: () => Effect.die('not implemented'),
    clearAudio: () => Effect.die('not implemented'),
    clearApproval: () => Effect.die('not implemented'),
    setApproval: () => Effect.die('not implemented'),

    findById: (id: string) =>
      Effect.suspend(() => {
        const voiceover = state.voiceovers.find((v) => v.id === id);
        if (!voiceover) {
          return Effect.fail(new VoiceoverNotFound({ id }));
        }
        return Effect.succeed(voiceover);
      }),
  };

  return Layer.succeed(VoiceoverRepo, service);
};

const createMockVoiceoverCollaboratorRepo = (
  state: MockState,
  options?: {
    onAdd?: (data: {
      voiceoverId: VoiceoverId;
      email: string;
      userId?: string;
      addedBy: string;
    }) => void;
  },
): Layer.Layer<VoiceoverCollaboratorRepo> => {
  const service: VoiceoverCollaboratorRepoService = {
    findById: () => Effect.die('not implemented'),
    findByVoiceover: () => Effect.die('not implemented'),
    findByEmail: () => Effect.die('not implemented'),
    findByVoiceoverAndUser: () => Effect.die('not implemented'),
    remove: () => Effect.die('not implemented'),
    claimByEmail: () => Effect.die('not implemented'),

    findByVoiceoverAndEmail: (voiceoverId: VoiceoverId, email: string) =>
      Effect.sync(() => {
        const collaborator = state.collaborators.find(
          (c) => c.voiceoverId === voiceoverId && c.email === email,
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
        const collaborator = createTestVoiceoverCollaborator({
          voiceoverId: data.voiceoverId,
          email: data.email,
          userId: data.userId ?? null,
          addedBy: data.addedBy,
        });
        state.collaborators.push(collaborator);
        return collaborator;
      }),
  };

  return Layer.succeed(VoiceoverCollaboratorRepo, service);
};

const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as never,
});

// =============================================================================
// Tests
// =============================================================================

describe('addVoiceoverCollaborator', () => {
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
      const voiceover = createTestVoiceover({
        id: 'voc_test0000000001' as VoiceoverId,
        createdBy: owner.id,
      });

      const state: MockState = {
        voiceovers: [voiceover],
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
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state, { onAdd: addSpy }),
      );

      const result = await Effect.runPromise(
        addVoiceoverCollaborator({
          voiceoverId: voiceover.id,
          email: collaboratorUser.email,
          addedBy: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.collaborator).toBeDefined();
      expect(result.collaborator.email).toBe(collaboratorUser.email);
      expect(result.collaborator.userId).toBe(collaboratorUser.id);
      expect(result.collaborator.userName).toBe(collaboratorUser.name);
      expect(addSpy).toHaveBeenCalledOnce();
      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          voiceoverId: voiceover.id,
          email: collaboratorUser.email,
          userId: collaboratorUser.id,
          addedBy: owner.id,
        }),
      );
    });

    it('adds pending collaborator for unregistered email', async () => {
      const owner = createTestUser({
        id: 'owner-id',
        email: 'owner@example.com',
      });
      const voiceover = createTestVoiceover({
        id: 'voc_test0000000001' as VoiceoverId,
        createdBy: owner.id,
      });

      const state: MockState = {
        voiceovers: [voiceover],
        collaborators: [],
        users: [
          { id: owner.id, email: owner.email, name: owner.name, image: null },
        ],
      };

      const addSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state, { onAdd: addSpy }),
      );

      const result = await Effect.runPromise(
        addVoiceoverCollaborator({
          voiceoverId: voiceover.id,
          email: 'newuser@example.com',
          addedBy: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.collaborator).toBeDefined();
      expect(result.collaborator.email).toBe('newuser@example.com');
      expect(result.collaborator.userId).toBeNull();
      expect(result.collaborator.userName).toBeNull();
      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          voiceoverId: voiceover.id,
          email: 'newuser@example.com',
          userId: undefined, // Not found in users
          addedBy: owner.id,
        }),
      );
    });
  });

  describe('error cases', () => {
    it('fails with VoiceoverNotFound when voiceover does not exist', async () => {
      const owner = createTestUser({ id: 'owner-id' });

      const state: MockState = {
        voiceovers: [],
        collaborators: [],
        users: [
          { id: owner.id, email: owner.email, name: owner.name, image: null },
        ],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state),
      );

      const result = await Effect.runPromiseExit(
        addVoiceoverCollaborator({
          voiceoverId: 'voc_nonexistent0000' as string,
          email: 'someone@example.com',
          addedBy: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(VoiceoverNotFound);
        if (error instanceof VoiceoverNotFound) {
          expect(error.id).toBe('voc_nonexistent0000');
        }
      }
    });

    it('fails with NotVoiceoverOwner when non-owner tries to add', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const nonOwner = createTestUser({ id: 'non-owner-id' });
      const voiceover = createTestVoiceover({
        id: 'voc_test0000000001' as VoiceoverId,
        createdBy: owner.id,
      });

      const state: MockState = {
        voiceovers: [voiceover],
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
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state),
      );

      const result = await Effect.runPromiseExit(
        addVoiceoverCollaborator({
          voiceoverId: voiceover.id,
          email: 'someone@example.com',
          addedBy: nonOwner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(NotVoiceoverOwner);
        if (error instanceof NotVoiceoverOwner) {
          expect(error.voiceoverId).toBe(voiceover.id);
          expect(error.userId).toBe(nonOwner.id);
        }
      }
    });

    it('fails with VoiceoverCollaboratorAlreadyExists when email already invited', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const voiceover = createTestVoiceover({
        id: 'voc_test0000000001' as VoiceoverId,
        createdBy: owner.id,
      });
      const existingCollaborator = createTestVoiceoverCollaborator({
        voiceoverId: voiceover.id,
        email: 'existing@example.com',
        addedBy: owner.id,
      });

      const state: MockState = {
        voiceovers: [voiceover],
        collaborators: [existingCollaborator],
        users: [
          { id: owner.id, email: owner.email, name: owner.name, image: null },
        ],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state),
      );

      const result = await Effect.runPromiseExit(
        addVoiceoverCollaborator({
          voiceoverId: voiceover.id,
          email: 'existing@example.com',
          addedBy: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(VoiceoverCollaboratorAlreadyExists);
        if (error instanceof VoiceoverCollaboratorAlreadyExists) {
          expect(error.voiceoverId).toBe(voiceover.id);
          expect(error.email).toBe('existing@example.com');
        }
      }
    });

    it('fails with CannotAddOwnerAsVoiceoverCollaborator when trying to add owner', async () => {
      const owner = createTestUser({
        id: 'owner-id',
        email: 'owner@example.com',
      });
      const voiceover = createTestVoiceover({
        id: 'voc_test0000000001' as VoiceoverId,
        createdBy: owner.id,
      });

      const state: MockState = {
        voiceovers: [voiceover],
        collaborators: [],
        users: [
          { id: owner.id, email: owner.email, name: owner.name, image: null },
        ],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state),
      );

      const result = await Effect.runPromiseExit(
        addVoiceoverCollaborator({
          voiceoverId: voiceover.id,
          email: owner.email, // Trying to add owner's own email
          addedBy: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(CannotAddOwnerAsVoiceoverCollaborator);
        if (error instanceof CannotAddOwnerAsVoiceoverCollaborator) {
          expect(error.voiceoverId).toBe(voiceover.id);
          expect(error.email).toBe(owner.email);
        }
      }
    });
  });

  describe('edge cases', () => {
    it('correctly handles case-sensitive email lookup', async () => {
      const owner = createTestUser({
        id: 'owner-id',
        email: 'owner@example.com',
      });
      const collaboratorUser = createTestUser({
        id: 'collab-id',
        email: 'Collaborator@Example.com', // Different case
        name: 'Collaborator',
      });
      const voiceover = createTestVoiceover({
        id: 'voc_test0000000001' as VoiceoverId,
        createdBy: owner.id,
      });

      const state: MockState = {
        voiceovers: [voiceover],
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
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state, { onAdd: addSpy }),
      );

      // Use exact case as stored - should find the user
      const result = await Effect.runPromise(
        addVoiceoverCollaborator({
          voiceoverId: voiceover.id,
          email: 'Collaborator@Example.com',
          addedBy: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.collaborator.userId).toBe(collaboratorUser.id);
    });

    it('sets user info correctly when user exists', async () => {
      const owner = createTestUser({
        id: 'owner-id',
        email: 'owner@example.com',
      });
      const collaboratorUser = createTestUser({
        id: 'collab-id',
        email: 'collaborator@example.com',
        name: 'John Doe',
      });
      const voiceover = createTestVoiceover({
        id: 'voc_test0000000001' as VoiceoverId,
        createdBy: owner.id,
      });

      const state: MockState = {
        voiceovers: [voiceover],
        collaborators: [],
        users: [
          { id: owner.id, email: owner.email, name: owner.name, image: null },
          {
            id: collaboratorUser.id,
            email: collaboratorUser.email,
            name: collaboratorUser.name,
            image: 'https://example.com/avatar.jpg',
          },
        ],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state),
      );

      const result = await Effect.runPromise(
        addVoiceoverCollaborator({
          voiceoverId: voiceover.id,
          email: collaboratorUser.email,
          addedBy: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.collaborator.userName).toBe('John Doe');
      expect(result.collaborator.userImage).toBe(
        'https://example.com/avatar.jpg',
      );
    });

    it('sets user info to null when user does not exist', async () => {
      const owner = createTestUser({
        id: 'owner-id',
        email: 'owner@example.com',
      });
      const voiceover = createTestVoiceover({
        id: 'voc_test0000000001' as VoiceoverId,
        createdBy: owner.id,
      });

      const state: MockState = {
        voiceovers: [voiceover],
        collaborators: [],
        users: [
          { id: owner.id, email: owner.email, name: owner.name, image: null },
        ],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state),
      );

      const result = await Effect.runPromise(
        addVoiceoverCollaborator({
          voiceoverId: voiceover.id,
          email: 'nonexistent@example.com',
          addedBy: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.collaborator.userName).toBeNull();
      expect(result.collaborator.userImage).toBeNull();
    });
  });
});
