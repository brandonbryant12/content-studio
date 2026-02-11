import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTestUser,
  createTestAdmin,
  withTestUser,
  resetAllFactories,
} from '@repo/testing';
import type { Voiceover, VoiceoverId } from '@repo/db/schema';
import { generateVoiceoverId } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import { VoiceoverNotFound } from '../../../errors';
import {
  VoiceoverRepo,
  type VoiceoverRepoService,
} from '../../repos/voiceover-repo';
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
  approvedBy?: string | null;
  approvedAt?: Date | null;
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
    approvedBy: options.approvedBy ?? null,
    approvedAt: options.approvedAt ?? null,
    createdBy: options.createdBy ?? 'test-owner-id',
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
};

const resetLocalCounters = () => {
  voiceoverCounter = 0;
};

// =============================================================================
// Mock Setup
// =============================================================================

interface MockState {
  voiceovers: Voiceover[];
}

const createMockVoiceoverRepo = (
  state: MockState,
  options?: {
    onSetApproval?: (id: string, approvedBy: string) => void;
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
    clearApproval: () => Effect.die('not implemented'),

    findById: (id: string) =>
      Effect.suspend(() => {
        const voiceover = state.voiceovers.find((v) => v.id === id);
        if (!voiceover) {
          return Effect.fail(new VoiceoverNotFound({ id }));
        }
        return Effect.succeed(voiceover);
      }),

    setApproval: (id: string, approvedBy: string) =>
      Effect.sync(() => {
        options?.onSetApproval?.(id, approvedBy);
        const voiceover = state.voiceovers.find((v) => v.id === id);
        return {
          ...voiceover!,
          approvedBy,
          approvedAt: new Date(),
        };
      }),
  };

  return Layer.succeed(VoiceoverRepo, service);
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

  describe('admin approval', () => {
    it('approves voiceover when admin requests', async () => {
      const admin = createTestAdmin({ id: 'admin-id' });
      const voiceover = createTestVoiceover({
        createdBy: 'owner-id',
        approvedBy: null,
      });

      const state: MockState = {
        voiceovers: [voiceover],
      };

      const setApprovalSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state, { onSetApproval: setApprovalSpy }),
      );

      const result = await Effect.runPromise(
        withTestUser(admin)(
          approveVoiceover({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.voiceover).toBeDefined();
      expect(result.voiceover.approvedBy).toBe(admin.id);
      expect(result.voiceover.approvedAt).toBeDefined();
      expect(setApprovalSpy).toHaveBeenCalledWith(voiceover.id, admin.id);
    });

    it('is idempotent - approving again when already approved succeeds', async () => {
      const admin = createTestAdmin({ id: 'admin-id' });
      const voiceover = createTestVoiceover({
        createdBy: 'owner-id',
        approvedBy: 'other-admin-id',
        approvedAt: new Date(),
      });

      const state: MockState = {
        voiceovers: [voiceover],
      };

      const setApprovalSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state, { onSetApproval: setApprovalSpy }),
      );

      const result = await Effect.runPromise(
        withTestUser(admin)(
          approveVoiceover({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.voiceover).toBeDefined();
      expect(result.voiceover.approvedBy).toBe(admin.id);
      // Should still call setApproval (idempotent behavior)
      expect(setApprovalSpy).toHaveBeenCalledWith(voiceover.id, admin.id);
    });

    it('records the admin user ID as approvedBy', async () => {
      const admin = createTestAdmin({ id: 'specific-admin-id' });
      const voiceover = createTestVoiceover({ createdBy: 'owner-id' });

      const state: MockState = {
        voiceovers: [voiceover],
      };

      const setApprovalSpy = vi.fn();
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockVoiceoverRepo(state, { onSetApproval: setApprovalSpy }),
      );

      await Effect.runPromise(
        withTestUser(admin)(
          approveVoiceover({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(setApprovalSpy).toHaveBeenCalledWith(
        voiceover.id,
        'specific-admin-id',
      );
    });
  });

  describe('error cases', () => {
    it('fails with VoiceoverNotFound when voiceover does not exist', async () => {
      const admin = createTestAdmin({ id: 'admin-id' });

      const state: MockState = {
        voiceovers: [],
      };

      const layers = Layer.mergeAll(MockDbLive, createMockVoiceoverRepo(state));

      const result = await Effect.runPromiseExit(
        withTestUser(admin)(
          approveVoiceover({
            voiceoverId: 'voc_nonexistent00000' as VoiceoverId,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(VoiceoverNotFound);
      }
    });

    it('fails with ForbiddenError when non-admin user tries to approve', async () => {
      const regularUser = createTestUser({ id: 'user-id', role: 'user' });
      const voiceover = createTestVoiceover({
        createdBy: regularUser.id,
      });

      const state: MockState = {
        voiceovers: [voiceover],
      };

      const layers = Layer.mergeAll(MockDbLive, createMockVoiceoverRepo(state));

      const result = await Effect.runPromiseExit(
        withTestUser(regularUser)(
          approveVoiceover({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeDefined();
        expect((error as { message: string }).message).toContain('role');
      }
    });

    it('fails when owner (non-admin) tries to approve their own voiceover', async () => {
      const owner = createTestUser({ id: 'owner-id', role: 'user' });
      const voiceover = createTestVoiceover({
        createdBy: owner.id,
      });

      const state: MockState = {
        voiceovers: [voiceover],
      };

      const layers = Layer.mergeAll(MockDbLive, createMockVoiceoverRepo(state));

      const result = await Effect.runPromiseExit(
        withTestUser(owner)(
          approveVoiceover({
            voiceoverId: voiceover.id,
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
    });
  });
});
