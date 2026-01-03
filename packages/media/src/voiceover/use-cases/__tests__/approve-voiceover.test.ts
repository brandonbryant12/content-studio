import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestUser, resetAllFactories } from '@repo/testing';
import type {
  Voiceover,
  VoiceoverCollaborator,
  VoiceoverId,
} from '@repo/db/schema';
import { generateVoiceoverId, generateVoiceoverCollaboratorId } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import { NotVoiceoverCollaborator, VoiceoverNotFound } from '../../../errors';
import {
  VoiceoverRepo,
  type VoiceoverRepoService,
} from '../../repos/voiceover-repo';
import {
  VoiceoverCollaboratorRepo,
  type VoiceoverCollaboratorRepoService,
} from '../../repos/voiceover-collaborator-repo';
import { approveVoiceover } from '../approve-voiceover';

// =============================================================================
// Test Factories
// =============================================================================

interface CreateTestVoiceoverOptions {
  id?: VoiceoverId;
  title?: string;
  text?: string;
  voice?: string;
  voiceName?: string | null;
  audioUrl?: string | null;
  duration?: number | null;
  status?: Voiceover['status'];
  errorMessage?: string | null;
  ownerHasApproved?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

let voiceoverCounter = 0;

const createTestVoiceover = (
  options: CreateTestVoiceoverOptions = {},
): Voiceover => {
  voiceoverCounter++;
  const now = new Date();

  return {
    id: options.id ?? generateVoiceoverId(),
    title: options.title ?? `Test Voiceover ${voiceoverCounter}`,
    text: options.text ?? 'Test voiceover text content.',
    voice: options.voice ?? 'Charon',
    voiceName: options.voiceName ?? null,
    audioUrl: options.audioUrl ?? null,
    duration: options.duration ?? null,
    status: options.status ?? 'drafting',
    errorMessage: options.errorMessage ?? null,
    ownerHasApproved: options.ownerHasApproved ?? false,
    createdBy: options.createdBy ?? 'test-owner-id',
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
};

interface CreateTestVoiceoverCollaboratorOptions {
  id?: VoiceoverCollaborator['id'];
  voiceoverId?: VoiceoverId;
  userId?: string | null;
  email?: string;
  hasApproved?: boolean;
  approvedAt?: Date | null;
  addedAt?: Date;
  addedBy?: string;
}

let collaboratorCounter = 0;

const createTestVoiceoverCollaborator = (
  options: CreateTestVoiceoverCollaboratorOptions = {},
): VoiceoverCollaborator => {
  collaboratorCounter++;
  const now = new Date();

  return {
    id: options.id ?? generateVoiceoverCollaboratorId(),
    voiceoverId: options.voiceoverId ?? generateVoiceoverId(),
    userId: options.userId ?? null,
    email: options.email ?? `collaborator${collaboratorCounter}@example.com`,
    hasApproved: options.hasApproved ?? false,
    approvedAt: options.approvedAt ?? null,
    addedAt: options.addedAt ?? now,
    addedBy: options.addedBy ?? 'test-owner-id',
  };
};

const resetLocalCounters = () => {
  voiceoverCounter = 0;
  collaboratorCounter = 0;
};

// =============================================================================
// Mock Setup
// =============================================================================

interface MockState {
  voiceovers: Voiceover[];
  collaborators: VoiceoverCollaborator[];
}

const createMockVoiceoverRepo = (
  state: MockState,
  options?: {
    onSetOwnerApproval?: (id: string, hasApproved: boolean) => void;
  },
): Layer.Layer<VoiceoverRepo> => {
  const service: VoiceoverRepoService = {
    insert: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateAudio: () => Effect.die('not implemented'),
    clearAudio: () => Effect.die('not implemented'),
    clearApprovals: () => Effect.die('not implemented'),

    findById: (id: string) =>
      Effect.suspend(() => {
        const voiceover = state.voiceovers.find((v) => v.id === id);
        if (!voiceover) {
          return Effect.fail(new VoiceoverNotFound({ id }));
        }
        return Effect.succeed(voiceover);
      }),

    setOwnerApproval: (id: string, hasApproved: boolean) =>
      Effect.sync(() => {
        options?.onSetOwnerApproval?.(id, hasApproved);
        const voiceover = state.voiceovers.find((v) => v.id === id);
        if (voiceover) {
          voiceover.ownerHasApproved = hasApproved;
        }
        return { ...voiceover!, ownerHasApproved: hasApproved };
      }),
  };

  return Layer.succeed(VoiceoverRepo, service);
};

const createMockVoiceoverCollaboratorRepo = (
  state: MockState,
  options?: {
    onApprove?: (voiceoverId: VoiceoverId, userId: string) => void;
  },
): Layer.Layer<VoiceoverCollaboratorRepo> => {
  const service: VoiceoverCollaboratorRepoService = {
    findById: () => Effect.die('not implemented'),
    findByVoiceover: () => Effect.die('not implemented'),
    findByEmail: () => Effect.die('not implemented'),
    findByVoiceoverAndEmail: () => Effect.die('not implemented'),
    lookupUserByEmail: () => Effect.die('not implemented'),
    add: () => Effect.die('not implemented'),
    remove: () => Effect.die('not implemented'),
    revokeApproval: () => Effect.die('not implemented'),
    clearAllApprovals: () => Effect.die('not implemented'),
    claimByEmail: () => Effect.die('not implemented'),

    findByVoiceoverAndUser: (voiceoverId: VoiceoverId, userId: string) =>
      Effect.sync(() => {
        const collaborator = state.collaborators.find(
          (c) => c.voiceoverId === voiceoverId && c.userId === userId,
        );
        return collaborator ?? null;
      }),

    approve: (voiceoverId: VoiceoverId, userId: string) =>
      Effect.sync(() => {
        options?.onApprove?.(voiceoverId, userId);
        const collaborator = state.collaborators.find(
          (c) => c.voiceoverId === voiceoverId && c.userId === userId,
        );
        if (collaborator) {
          collaborator.hasApproved = true;
          collaborator.approvedAt = new Date();
          return collaborator;
        }
        return null;
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

describe('approveVoiceover', () => {
  beforeEach(() => {
    resetAllFactories();
    resetLocalCounters();
  });

  describe('owner approval', () => {
    it('sets ownerHasApproved when owner approves', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const voiceover = createTestVoiceover({
        createdBy: owner.id,
        ownerHasApproved: false,
      });

      const state: MockState = {
        voiceovers: [voiceover],
        collaborators: [],
      };

      const setOwnerApprovalSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state, {
          onSetOwnerApproval: setOwnerApprovalSpy,
        }),
        createMockVoiceoverCollaboratorRepo(state),
      );

      const result = await Effect.runPromise(
        approveVoiceover({
          voiceoverId: voiceover.id,
          userId: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.isOwner).toBe(true);
      expect(result.voiceover).toBeDefined();
      expect(result.voiceover.ownerHasApproved).toBe(true);
      expect(setOwnerApprovalSpy).toHaveBeenCalledWith(voiceover.id, true);
    });

    it('is idempotent - approving again when already approved succeeds', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const voiceover = createTestVoiceover({
        createdBy: owner.id,
        ownerHasApproved: true, // Already approved
      });

      const state: MockState = {
        voiceovers: [voiceover],
        collaborators: [],
      };

      const setOwnerApprovalSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state, {
          onSetOwnerApproval: setOwnerApprovalSpy,
        }),
        createMockVoiceoverCollaboratorRepo(state),
      );

      const result = await Effect.runPromise(
        approveVoiceover({
          voiceoverId: voiceover.id,
          userId: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.isOwner).toBe(true);
      expect(result.voiceover.ownerHasApproved).toBe(true);
      // Should still call setOwnerApproval (idempotent behavior)
      expect(setOwnerApprovalSpy).toHaveBeenCalledWith(voiceover.id, true);
    });
  });

  describe('collaborator approval', () => {
    it('sets hasApproved when collaborator approves', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const collaboratorUser = createTestUser({ id: 'collab-id' });
      const voiceover = createTestVoiceover({
        createdBy: owner.id,
      });
      const collaborator = createTestVoiceoverCollaborator({
        voiceoverId: voiceover.id,
        userId: collaboratorUser.id,
        email: 'collaborator@example.com',
        hasApproved: false,
      });

      const state: MockState = {
        voiceovers: [voiceover],
        collaborators: [collaborator],
      };

      const approveSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state, { onApprove: approveSpy }),
      );

      const result = await Effect.runPromise(
        approveVoiceover({
          voiceoverId: voiceover.id,
          userId: collaboratorUser.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.isOwner).toBe(false);
      expect(result.voiceover).toBeDefined();
      expect(approveSpy).toHaveBeenCalledWith(voiceover.id, collaboratorUser.id);
    });

    it('is idempotent - approving again when already approved succeeds', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const collaboratorUser = createTestUser({ id: 'collab-id' });
      const voiceover = createTestVoiceover({
        createdBy: owner.id,
      });
      const collaborator = createTestVoiceoverCollaborator({
        voiceoverId: voiceover.id,
        userId: collaboratorUser.id,
        email: 'collaborator@example.com',
        hasApproved: true, // Already approved
        approvedAt: new Date(),
      });

      const state: MockState = {
        voiceovers: [voiceover],
        collaborators: [collaborator],
      };

      const approveSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state, { onApprove: approveSpy }),
      );

      const result = await Effect.runPromise(
        approveVoiceover({
          voiceoverId: voiceover.id,
          userId: collaboratorUser.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.isOwner).toBe(false);
      // Should still call approve (idempotent behavior)
      expect(approveSpy).toHaveBeenCalledWith(voiceover.id, collaboratorUser.id);
    });
  });

  describe('error cases', () => {
    it('fails with VoiceoverNotFound when voiceover does not exist', async () => {
      const user = createTestUser({ id: 'user-id' });

      const state: MockState = {
        voiceovers: [],
        collaborators: [],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state),
      );

      const result = await Effect.runPromiseExit(
        approveVoiceover({
          voiceoverId: 'voc_nonexistent00000' as VoiceoverId,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(VoiceoverNotFound);
      }
    });

    it('fails with NotVoiceoverCollaborator when user is neither owner nor collaborator', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const stranger = createTestUser({ id: 'stranger-id' });
      const voiceover = createTestVoiceover({
        createdBy: owner.id,
      });

      const state: MockState = {
        voiceovers: [voiceover],
        collaborators: [],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state),
      );

      const result = await Effect.runPromiseExit(
        approveVoiceover({
          voiceoverId: voiceover.id,
          userId: stranger.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(NotVoiceoverCollaborator);
        if (error instanceof NotVoiceoverCollaborator) {
          expect(error.voiceoverId).toBe(voiceover.id);
          expect(error.userId).toBe(stranger.id);
        }
      }
    });

    it('fails with NotVoiceoverCollaborator when collaborator is pending (no userId)', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const user = createTestUser({ id: 'user-id', email: 'pending@example.com' });
      const voiceover = createTestVoiceover({
        createdBy: owner.id,
      });
      // Pending collaborator - has email but no userId (not yet claimed)
      const pendingCollaborator = createTestVoiceoverCollaborator({
        voiceoverId: voiceover.id,
        userId: null, // Pending - not claimed yet
        email: 'pending@example.com',
        hasApproved: false,
      });

      const state: MockState = {
        voiceovers: [voiceover],
        collaborators: [pendingCollaborator],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state),
      );

      // User tries to approve but their collaborator record has no userId (pending)
      const result = await Effect.runPromiseExit(
        approveVoiceover({
          voiceoverId: voiceover.id,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(NotVoiceoverCollaborator);
      }
    });
  });

  describe('edge cases', () => {
    it('handles voiceover with multiple collaborators - only approves requesting user', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const collaborator1 = createTestUser({ id: 'collab-1-id' });
      const collaborator2 = createTestUser({ id: 'collab-2-id' });
      const voiceover = createTestVoiceover({
        createdBy: owner.id,
      });
      const collab1Record = createTestVoiceoverCollaborator({
        voiceoverId: voiceover.id,
        userId: collaborator1.id,
        email: 'collab1@example.com',
        hasApproved: false,
      });
      const collab2Record = createTestVoiceoverCollaborator({
        voiceoverId: voiceover.id,
        userId: collaborator2.id,
        email: 'collab2@example.com',
        hasApproved: false,
      });

      const state: MockState = {
        voiceovers: [voiceover],
        collaborators: [collab1Record, collab2Record],
      };

      const approveSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state),
        createMockVoiceoverCollaboratorRepo(state, { onApprove: approveSpy }),
      );

      // Collaborator 1 approves
      await Effect.runPromise(
        approveVoiceover({
          voiceoverId: voiceover.id,
          userId: collaborator1.id,
        }).pipe(Effect.provide(layers)),
      );

      // Only collaborator 1 should have been approved
      expect(approveSpy).toHaveBeenCalledTimes(1);
      expect(approveSpy).toHaveBeenCalledWith(voiceover.id, collaborator1.id);
      expect(collab1Record.hasApproved).toBe(true);
      expect(collab2Record.hasApproved).toBe(false);
    });

    it('owner can approve even when collaborators exist', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const collaboratorUser = createTestUser({ id: 'collab-id' });
      const voiceover = createTestVoiceover({
        createdBy: owner.id,
        ownerHasApproved: false,
      });
      const collaborator = createTestVoiceoverCollaborator({
        voiceoverId: voiceover.id,
        userId: collaboratorUser.id,
        email: 'collaborator@example.com',
        hasApproved: false,
      });

      const state: MockState = {
        voiceovers: [voiceover],
        collaborators: [collaborator],
      };

      const setOwnerApprovalSpy = vi.fn();
      const approveSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state, {
          onSetOwnerApproval: setOwnerApprovalSpy,
        }),
        createMockVoiceoverCollaboratorRepo(state, { onApprove: approveSpy }),
      );

      const result = await Effect.runPromise(
        approveVoiceover({
          voiceoverId: voiceover.id,
          userId: owner.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.isOwner).toBe(true);
      expect(setOwnerApprovalSpy).toHaveBeenCalledWith(voiceover.id, true);
      // Collaborator approve should NOT be called
      expect(approveSpy).not.toHaveBeenCalled();
    });
  });
});
