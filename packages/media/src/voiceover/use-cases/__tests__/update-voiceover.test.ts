import { ForbiddenError } from '@repo/auth';
import { Db, type DbService } from '@repo/db/effect';
import { createTestUser, withTestUser, resetAllFactories } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Voiceover, VoiceoverId, UpdateVoiceover } from '@repo/db/schema';
import { VoiceoverNotFound } from '../../../errors';
import { VoiceoverRepo, type VoiceoverRepoService } from '../../repos';
import { updateVoiceover } from '../update-voiceover';

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
  onUpdate?: (id: string, data: UpdateVoiceover) => void;
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
    delete: () => Effect.die('Not implemented'),
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

    update: (id, data) =>
      Effect.suspend(() => {
        const existing = options.voiceovers.get(id);
        if (!existing) {
          return Effect.fail(new VoiceoverNotFound({ id }));
        }
        options.onUpdate?.(id, data);
        const updated: Voiceover = {
          ...existing,
          title: data.title ?? existing.title,
          text: data.text ?? existing.text,
          voice: data.voice ?? existing.voice,
          voiceName:
            data.voiceName !== undefined ? data.voiceName : existing.voiceName,
          updatedAt: new Date(),
        };
        options.voiceovers.set(id, updated);
        return Effect.succeed(updated);
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
    onUpdate?: (id: string, data: UpdateVoiceover) => void;
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

describe('updateVoiceover', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('success cases', () => {
    it('updates title when owner requests', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        title: 'Original Title',
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      const result = await runTest(
        withTestUser(owner)(
          updateVoiceover({
            voiceoverId: voiceover.id,
            data: { title: 'Updated Title' },
          }),
        ),
        { voiceovers },
      );

      expect(result.title).toBe('Updated Title');
    });

    it('updates text when owner requests', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        text: 'Original text content',
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      const result = await runTest(
        withTestUser(owner)(
          updateVoiceover({
            voiceoverId: voiceover.id,
            data: { text: 'Updated text content' },
          }),
        ),
        { voiceovers },
      );

      expect(result.text).toBe('Updated text content');
    });

    it('updates voice when owner requests', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        voice: 'Charon',
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      const result = await runTest(
        withTestUser(owner)(
          updateVoiceover({
            voiceoverId: voiceover.id,
            data: { voice: 'NewVoice' },
          }),
        ),
        { voiceovers },
      );

      expect(result.voice).toBe('NewVoice');
    });

    it('updates voiceName when owner requests', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        voiceName: null,
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      const result = await runTest(
        withTestUser(owner)(
          updateVoiceover({
            voiceoverId: voiceover.id,
            data: { voiceName: 'Custom Voice Name' },
          }),
        ),
        { voiceovers },
      );

      expect(result.voiceName).toBe('Custom Voice Name');
    });

    it('allows setting voiceName to null', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        voiceName: 'Existing Name',
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      const result = await runTest(
        withTestUser(owner)(
          updateVoiceover({
            voiceoverId: voiceover.id,
            data: { voiceName: null },
          }),
        ),
        { voiceovers },
      );

      expect(result.voiceName).toBeNull();
    });

    it('updates multiple fields at once', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        title: 'Original Title',
        text: 'Original text',
        voice: 'Charon',
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      const result = await runTest(
        withTestUser(owner)(
          updateVoiceover({
            voiceoverId: voiceover.id,
            data: {
              title: 'New Title',
              text: 'New text content',
              voice: 'NewVoice',
            },
          }),
        ),
        { voiceovers },
      );

      expect(result.title).toBe('New Title');
      expect(result.text).toBe('New text content');
      expect(result.voice).toBe('NewVoice');
    });

    it('preserves unchanged fields', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        title: 'Original Title',
        text: 'Original text',
        voice: 'Charon',
        voiceName: 'Original Voice Name',
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      const result = await runTest(
        withTestUser(owner)(
          updateVoiceover({
            voiceoverId: voiceover.id,
            data: { title: 'New Title' }, // Only updating title
          }),
        ),
        { voiceovers },
      );

      expect(result.title).toBe('New Title');
      expect(result.text).toBe('Original text');
      expect(result.voice).toBe('Charon');
      expect(result.voiceName).toBe('Original Voice Name');
    });
  });

  describe('authorization', () => {
    it('allows owner to update their voiceover', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      const result = await runTest(
        withTestUser(owner)(
          updateVoiceover({
            voiceoverId: voiceover.id,
            data: { title: 'Updated by Owner' },
          }),
        ),
        { voiceovers },
      );

      expect(result.title).toBe('Updated by Owner');
    });

    it('fails with ForbiddenError when non-owner tries to update', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const nonOwner = createTestUser({ id: 'non-owner-456' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);

      const error = await runTestExpectFailure(
        withTestUser(nonOwner)(
          updateVoiceover({
            voiceoverId: voiceover.id,
            data: { title: 'Attempted Update' },
          }),
        ),
        { voiceovers },
      );

      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });

  describe('error cases', () => {
    it('fails with VoiceoverNotFound when voiceover does not exist', async () => {
      const user = createTestUser({ id: 'user-123' });
      const nonExistentId = 'voc_nonexistent1234' as VoiceoverId;

      const voiceovers = new Map<string, Voiceover>();

      const error = await runTestExpectFailure(
        withTestUser(user)(
          updateVoiceover({
            voiceoverId: nonExistentId,
            data: { title: 'Should Fail' },
          }),
        ),
        { voiceovers },
      );

      expect(error).toBeInstanceOf(VoiceoverNotFound);
      expect((error as VoiceoverNotFound).id).toBe(nonExistentId);
    });
  });

  describe('update tracking', () => {
    it('calls repository update with correct data', async () => {
      const owner = createTestUser({ id: 'owner-123' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        createdBy: owner.id,
      });

      const voiceovers = new Map([[voiceover.id, voiceover]]);
      let capturedId: string | null = null;
      let capturedData: UpdateVoiceover | null = null;

      await runTest(
        withTestUser(owner)(
          updateVoiceover({
            voiceoverId: voiceover.id,
            data: { title: 'New Title', text: 'New Text' },
          }),
        ),
        {
          voiceovers,
          onUpdate: (id, data) => {
            capturedId = id;
            capturedData = data;
          },
        },
      );

      expect(capturedId).toBe(voiceover.id);
      expect(capturedData).toEqual({ title: 'New Title', text: 'New Text' });
    });
  });
});
