import { ForbiddenError } from '@repo/auth';
import { Db } from '@repo/db/effect';
import { generateVoiceoverId } from '@repo/db/schema';
import {
  createTestUser,
  createTestAdmin,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Voiceover, VoiceoverId } from '@repo/db/schema';
import { VoiceoverNotFound } from '../../../errors';
import {
  VoiceoverRepo,
  type VoiceoverRepoService,
} from '../../repos/voiceover-repo';
import { revokeVoiceoverApproval } from '../revoke-approval';

// =============================================================================
// Test Helpers
// =============================================================================

interface MockState {
  voiceovers: Voiceover[];
}

const createMockVoiceoverRepo = (
  state: MockState,
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
    setApproval: () => Effect.die('not implemented'),

    findById: (id: string) =>
      Effect.suspend(() => {
        const voiceover = state.voiceovers.find((v) => v.id === id);
        if (!voiceover) {
          return Effect.fail(new VoiceoverNotFound({ id }));
        }
        return Effect.succeed(voiceover);
      }),

    clearApproval: (id: string) =>
      Effect.suspend(() => {
        const voiceover = state.voiceovers.find((v) => v.id === id);
        if (!voiceover) {
          return Effect.fail(new VoiceoverNotFound({ id }));
        }
        return Effect.succeed({
          ...voiceover,
          approvedBy: null,
          approvedAt: null,
        });
      }),
  };

  return Layer.succeed(VoiceoverRepo, service);
};

const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as never,
});

const createTestVoiceover = (
  overrides: Partial<Voiceover> = {},
): Voiceover => ({
  id: generateVoiceoverId(),
  title: 'Test Voiceover',
  text: 'Test text',
  voice: 'Charon',
  voiceName: null,
  audioUrl: null,
  duration: null,
  status: 'ready',
  errorMessage: null,
  approvedBy: null,
  approvedAt: null,
  createdBy: 'test-owner-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('revokeVoiceoverApproval', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('admin revoke', () => {
    it('clears approval when admin revokes', async () => {
      const admin = createTestAdmin({ id: 'admin-id' });
      const voiceover = createTestVoiceover({
        createdBy: 'owner-id',
        approvedBy: 'admin-id',
        approvedAt: new Date(),
      });

      const state: MockState = { voiceovers: [voiceover] };
      const layers = Layer.mergeAll(MockDbLive, createMockVoiceoverRepo(state));

      const result = await Effect.runPromise(
        withTestUser(admin)(
          revokeVoiceoverApproval({ voiceoverId: voiceover.id }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(result.voiceover.approvedBy).toBeNull();
      expect(result.voiceover.approvedAt).toBeNull();
    });
  });

  describe('error cases', () => {
    it('fails with ForbiddenError when non-admin tries to revoke', async () => {
      const regularUser = createTestUser({ id: 'user-id' });
      const voiceover = createTestVoiceover({
        createdBy: regularUser.id,
        approvedBy: 'admin-id',
        approvedAt: new Date(),
      });

      const state: MockState = { voiceovers: [voiceover] };
      const layers = Layer.mergeAll(MockDbLive, createMockVoiceoverRepo(state));

      const result = await Effect.runPromiseExit(
        withTestUser(regularUser)(
          revokeVoiceoverApproval({ voiceoverId: voiceover.id }).pipe(
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

    it('fails with VoiceoverNotFound when voiceover does not exist', async () => {
      const admin = createTestAdmin({ id: 'admin-id' });

      const state: MockState = { voiceovers: [] };
      const layers = Layer.mergeAll(MockDbLive, createMockVoiceoverRepo(state));

      const result = await Effect.runPromiseExit(
        withTestUser(admin)(
          revokeVoiceoverApproval({
            voiceoverId: 'voc_nonexistent00000' as string,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(VoiceoverNotFound);
      }
    });
  });
});
