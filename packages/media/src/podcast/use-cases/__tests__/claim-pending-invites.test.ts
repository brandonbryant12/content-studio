import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTestUser,
  createTestCollaborator,
  resetAllFactories,
} from '@repo/testing';
import type { Collaborator } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import {
  CollaboratorRepo,
  type CollaboratorRepoService,
} from '../../repos/collaborator-repo';
import { claimPendingInvites } from '../claim-pending-invites';

// =============================================================================
// Test Setup
// =============================================================================

interface MockState {
  collaborators: Collaborator[];
}

const createMockCollaboratorRepo = (
  state: MockState,
  options?: {
    onClaimByEmail?: (email: string, userId: string) => void;
  },
): Layer.Layer<CollaboratorRepo> => {
  const service: CollaboratorRepoService = {
    findById: () => Effect.die('not implemented'),
    findByPodcast: () => Effect.die('not implemented'),
    findByEmail: () => Effect.die('not implemented'),
    findByPodcastAndUser: () => Effect.die('not implemented'),
    findByPodcastAndEmail: () => Effect.die('not implemented'),
    lookupUserByEmail: () => Effect.die('not implemented'),
    add: () => Effect.die('not implemented'),
    remove: () => Effect.die('not implemented'),

    claimByEmail: (email: string, userId: string) =>
      Effect.sync(() => {
        options?.onClaimByEmail?.(email, userId);
        // Find all pending invites for this email (userId is null)
        const pendingInvites = state.collaborators.filter(
          (c) => c.email === email && c.userId === null,
        );
        // Update them
        pendingInvites.forEach((c) => {
          c.userId = userId;
        });
        return pendingInvites.length;
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

describe('claimPendingInvites', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('success cases', () => {
    it('claims pending invites for email', async () => {
      const user = createTestUser({ id: 'user-id', email: 'user@example.com' });
      const pendingInvite1 = createTestCollaborator({
        email: user.email,
        userId: null,
      });
      const pendingInvite2 = createTestCollaborator({
        email: user.email,
        userId: null,
      });

      const state: MockState = {
        collaborators: [pendingInvite1, pendingInvite2],
      };

      const claimSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockCollaboratorRepo(state, { onClaimByEmail: claimSpy }),
      );

      const result = await Effect.runPromise(
        claimPendingInvites({
          email: user.email,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.claimedCount).toBe(2);
      expect(claimSpy).toHaveBeenCalledWith(user.email, user.id);
    });

    it('returns 0 when no pending invites exist', async () => {
      const user = createTestUser({ id: 'user-id', email: 'user@example.com' });

      const state: MockState = {
        collaborators: [],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockCollaboratorRepo(state),
      );

      const result = await Effect.runPromise(
        claimPendingInvites({
          email: user.email,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.claimedCount).toBe(0);
    });

    it('only claims invites for matching email', async () => {
      const user = createTestUser({ id: 'user-id', email: 'user@example.com' });
      const pendingInvite = createTestCollaborator({
        email: user.email,
        userId: null,
      });
      const otherInvite = createTestCollaborator({
        email: 'other@example.com',
        userId: null,
      });

      const state: MockState = {
        collaborators: [pendingInvite, otherInvite],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockCollaboratorRepo(state),
      );

      const result = await Effect.runPromise(
        claimPendingInvites({
          email: user.email,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.claimedCount).toBe(1);
      expect(state.collaborators[0]!.userId).toBe(user.id);
      expect(state.collaborators[1]!.userId).toBeNull(); // Unchanged
    });

    it('does not claim already claimed invites', async () => {
      const user = createTestUser({ id: 'user-id', email: 'user@example.com' });
      const otherUser = createTestUser({ id: 'other-id' });
      const alreadyClaimed = createTestCollaborator({
        email: user.email,
        userId: otherUser.id, // Already claimed by someone else
      });
      const pendingInvite = createTestCollaborator({
        email: user.email,
        userId: null, // Not yet claimed
      });

      const state: MockState = {
        collaborators: [alreadyClaimed, pendingInvite],
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockCollaboratorRepo(state),
      );

      const result = await Effect.runPromise(
        claimPendingInvites({
          email: user.email,
          userId: user.id,
        }).pipe(Effect.provide(layers)),
      );

      expect(result.claimedCount).toBe(1);
      // Only the pending one should be claimed
      expect(state.collaborators[0]!.userId).toBe(otherUser.id); // Unchanged
      expect(state.collaborators[1]!.userId).toBe(user.id); // Claimed
    });
  });
});
