import { ForbiddenError } from '@repo/auth';
import { Db, type DbService } from '@repo/db/effect';
import { createTestUser, withTestUser, resetAllFactories } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Voiceover, VoiceoverId } from '@repo/db/schema';
import { VoiceoverNotFound } from '../../../errors';
import { VoiceoverRepo, type VoiceoverRepoService } from '../../repos';
import { deleteVoiceover } from '../delete-voiceover';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock voiceover for testing.
 */
const createMockVoiceover = (
  overrides: Partial<Voiceover> = {},
): Voiceover => ({
  id: 'voc_test123456789012' as VoiceoverId,
  title: 'Test Voiceover',
  text: 'This is test voiceover text.',
  voice: 'Charon',
  voiceName: null,
  audioUrl: null,
  duration: null,
  status: 'drafting',
  errorMessage: null,
  approvedBy: null,
  approvedAt: null,
  createdBy: 'user_123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

/**
 * Create a mock Db layer (not used since we mock the repo).
 */
const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as DbService['db'],
});

interface MockRepoOptions {
  voiceovers: Map<string, Voiceover>;
  onDelete?: (id: string) => void;
}

/**
 * Create a mock VoiceoverRepo layer with state.
 */
const createMockVoiceoverRepo = (
  options: MockRepoOptions,
): Layer.Layer<VoiceoverRepo> => {
  const service: VoiceoverRepoService = {
    insert: () => Effect.die('Not implemented'),
    list: () => Effect.die('Not implemented'),
    count: () => Effect.die('Not implemented'),
    update: () => Effect.die('Not implemented'),
    updateStatus: () => Effect.die('Not implemented'),
    updateAudio: () => Effect.die('Not implemented'),
    clearAudio: () => Effect.die('Not implemented'),
    clearApproval: () => Effect.die('Not implemented'),
    setApproval: () => Effect.die('Not implemented'),

    findById: (id) =>
      Effect.suspend(() => {
        const voiceover = options.voiceovers.get(id);
        if (!voiceover) {
          return Effect.fail(new VoiceoverNotFound({ id }));
        }
        return Effect.succeed(voiceover);
      }),

    delete: (id) =>
      Effect.sync(() => {
        options.onDelete?.(id);
        const existed = options.voiceovers.has(id);
        options.voiceovers.delete(id);
        return existed;
      }),
  };

  return Layer.succeed(VoiceoverRepo, service);
};

/**
 * Run an effect with test layers.
 */
const runTest = <A, E>(
  effect: Effect.Effect<A, E, Db | VoiceoverRepo>,
  options: {
    voiceovers: Map<string, Voiceover>;
    onDelete?: (id: string) => void;
  },
) => {
  const layers = Layer.mergeAll(MockDbLive, createMockVoiceoverRepo(options));
  return Effect.runPromise(effect.pipe(Effect.provide(layers)));
};

/**
 * Run an effect and expect it to fail.
 */
const runTestExpectFailure = async <A, E>(
  effect: Effect.Effect<A, E, Db | VoiceoverRepo>,
  options: {
    voiceovers: Map<string, Voiceover>;
  },
): Promise<E> => {
  const layers = Layer.mergeAll(MockDbLive, createMockVoiceoverRepo(options));
  const result = await Effect.runPromiseExit(
    effect.pipe(Effect.provide(layers)),
  );

  if (result._tag === 'Success') {
    throw new Error('Expected effect to fail but it succeeded');
  }

  if (result.cause._tag !== 'Fail') {
    throw new Error(`Expected Fail cause but got ${result.cause._tag}`);
  }

  return result.cause.error as E;
};

// =============================================================================
// Tests
// =============================================================================

describe('deleteVoiceover', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('success cases', () => {
    it('deletes voiceover when owner requests', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);
      const deletedIds: string[] = [];

      await runTest(
        withTestUser(owner)(
          deleteVoiceover({
            voiceoverId: voiceover.id,
          }),
        ),
        {
          voiceovers,
          onDelete: (id) => deletedIds.push(id),
        },
      );

      expect(deletedIds).toContain(voiceover.id);
      expect(voiceovers.has(voiceover.id)).toBe(false);
    });

    it('deletes voiceover in drafting status', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_drafting123456' as VoiceoverId,
        status: 'drafting',
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      await runTest(
        withTestUser(owner)(
          deleteVoiceover({
            voiceoverId: voiceover.id,
          }),
        ),
        { voiceovers },
      );

      expect(voiceovers.has(voiceover.id)).toBe(false);
    });

    it('deletes voiceover in ready status', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_ready12345678' as VoiceoverId,
        status: 'ready',
        audioUrl: 'https://example.com/audio.mp3',
        duration: 120,
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      await runTest(
        withTestUser(owner)(
          deleteVoiceover({
            voiceoverId: voiceover.id,
          }),
        ),
        { voiceovers },
      );

      expect(voiceovers.has(voiceover.id)).toBe(false);
    });

    it('deletes voiceover in failed status', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_failed12345678' as VoiceoverId,
        status: 'failed',
        errorMessage: 'Generation failed',
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      await runTest(
        withTestUser(owner)(
          deleteVoiceover({
            voiceoverId: voiceover.id,
          }),
        ),
        { voiceovers },
      );

      expect(voiceovers.has(voiceover.id)).toBe(false);
    });
  });

  describe('authorization', () => {
    it('allows owner to delete their voiceover', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      await runTest(
        withTestUser(owner)(
          deleteVoiceover({
            voiceoverId: voiceover.id,
          }),
        ),
        { voiceovers },
      );

      expect(voiceovers.has(voiceover.id)).toBe(false);
    });

    it('fails with ForbiddenError when non-owner tries to delete', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const nonOwner = createTestUser({ id: 'non-owner-456' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      const error = await runTestExpectFailure(
        withTestUser(nonOwner)(
          deleteVoiceover({
            voiceoverId: voiceover.id,
          }),
        ),
        { voiceovers },
      );

      expect(error).toBeInstanceOf(ForbiddenError);
    });

    it('does not delete when authorization fails', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const nonOwner = createTestUser({ id: 'non-owner-456' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);
      const deletedIds: string[] = [];

      await runTestExpectFailure(
        withTestUser(nonOwner)(
          deleteVoiceover({
            voiceoverId: voiceover.id,
          }),
        ),
        { voiceovers },
      );

      // Voiceover should still exist
      expect(voiceovers.has(voiceover.id)).toBe(true);
      expect(deletedIds).not.toContain(voiceover.id);
    });
  });

  describe('error cases', () => {
    it('fails with VoiceoverNotFound when voiceover does not exist', async () => {
      const user = createTestUser({ id: 'user-123' });
      const nonExistentId = 'voc_nonexistent1234' as VoiceoverId;

      const voiceovers = new Map<string, Voiceover>();

      const error = await runTestExpectFailure(
        withTestUser(user)(
          deleteVoiceover({
            voiceoverId: nonExistentId,
          }),
        ),
        { voiceovers },
      );

      expect(error).toBeInstanceOf(VoiceoverNotFound);
      expect((error as VoiceoverNotFound).id).toBe(nonExistentId);
    });
  });

  describe('delete tracking', () => {
    it('calls repository delete with correct voiceover ID', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);
      let capturedId: string | null = null;

      await runTest(
        withTestUser(owner)(
          deleteVoiceover({
            voiceoverId: voiceover.id,
          }),
        ),
        {
          voiceovers,
          onDelete: (id) => {
            capturedId = id;
          },
        },
      );

      expect(capturedId).toBe(voiceover.id);
    });
  });

  describe('edge cases', () => {
    it('deletes voiceover with audio URL (audio cleanup is separate)', async () => {
      // Note: Audio files in storage are cleaned up separately
      // (via a background job or storage lifecycle policy)
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_withaudio12345' as VoiceoverId,
        audioUrl: 'https://storage.example.com/audio/voc_withaudio12345.mp3',
        duration: 180,
        status: 'ready',
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      await runTest(
        withTestUser(owner)(
          deleteVoiceover({
            voiceoverId: voiceover.id,
          }),
        ),
        { voiceovers },
      );

      // Voiceover record should be deleted
      expect(voiceovers.has(voiceover.id)).toBe(false);
    });

    it('deletes voiceover successfully', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_withcollabs123' as VoiceoverId,
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      await runTest(
        withTestUser(owner)(
          deleteVoiceover({
            voiceoverId: voiceover.id,
          }),
        ),
        { voiceovers },
      );

      expect(voiceovers.has(voiceover.id)).toBe(false);
    });
  });
});
