import { describe, it, expect, beforeEach } from 'vitest';
import { Effect, Layer } from 'effect';
import { Db, type DbService } from '@repo/db/effect';
import type { Voiceover, VoiceoverId } from '@repo/db/schema';
import {
  createTestUser,
  withTestUser,
  resetAllFactories,
} from '@repo/testing';
import { VoiceoverNotFound } from '../../../errors';
import { VoiceoverRepo, type VoiceoverRepoService } from '../../repos';
import { getVoiceover } from '../get-voiceover';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock voiceover for testing.
 */
const createMockVoiceover = (overrides: Partial<Voiceover> = {}): Voiceover => ({
  id: 'voc_test123456789012' as VoiceoverId,
  title: 'Test Voiceover',
  text: 'This is test voiceover text.',
  voice: 'Charon',
  voiceName: null,
  audioUrl: null,
  duration: null,
  status: 'drafting',
  errorMessage: null,
  ownerHasApproved: false,
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

/**
 * Create a mock VoiceoverRepo layer.
 */
const createMockVoiceoverRepo = (
  findByIdFn: VoiceoverRepoService['findById'],
): Layer.Layer<VoiceoverRepo> =>
  Layer.succeed(VoiceoverRepo, {
    insert: () => Effect.die('Not implemented'),
    findById: findByIdFn,
    list: () => Effect.die('Not implemented'),
    update: () => Effect.die('Not implemented'),
    delete: () => Effect.die('Not implemented'),
    count: () => Effect.die('Not implemented'),
    updateStatus: () => Effect.die('Not implemented'),
    updateAudio: () => Effect.die('Not implemented'),
    clearAudio: () => Effect.die('Not implemented'),
    clearApprovals: () => Effect.die('Not implemented'),
    setOwnerApproval: () => Effect.die('Not implemented'),
  });

// =============================================================================
// Tests
// =============================================================================

describe('getVoiceover', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('success cases', () => {
    it('returns voiceover when found', async () => {
      const user = createTestUser({ id: 'user_123' });
      const voiceover = createMockVoiceover({
        id: 'voc_existing1234567' as VoiceoverId,
        title: 'My Voiceover',
        text: 'Hello world',
        createdBy: user.id,
      });

      const mockRepo = createMockVoiceoverRepo(() => Effect.succeed(voiceover));
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(
          getVoiceover({ voiceoverId: voiceover.id }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(result.id).toBe(voiceover.id);
      expect(result.title).toBe('My Voiceover');
      expect(result.text).toBe('Hello world');
      expect(result.createdBy).toBe(user.id);
    });

    it('returns voiceover with all fields populated', async () => {
      const user = createTestUser({ id: 'user_123' });
      const voiceover = createMockVoiceover({
        id: 'voc_complete123456' as VoiceoverId,
        title: 'Complete Voiceover',
        text: 'Full text content here',
        voice: 'CustomVoice',
        voiceName: 'Custom Voice Name',
        audioUrl: 'https://example.com/audio.mp3',
        duration: 120,
        status: 'ready',
        ownerHasApproved: true,
        createdBy: user.id,
      });

      const mockRepo = createMockVoiceoverRepo(() => Effect.succeed(voiceover));
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(
          getVoiceover({ voiceoverId: voiceover.id }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(result.id).toBe(voiceover.id);
      expect(result.title).toBe('Complete Voiceover');
      expect(result.text).toBe('Full text content here');
      expect(result.voice).toBe('CustomVoice');
      expect(result.voiceName).toBe('Custom Voice Name');
      expect(result.audioUrl).toBe('https://example.com/audio.mp3');
      expect(result.duration).toBe(120);
      expect(result.status).toBe('ready');
      expect(result.ownerHasApproved).toBe(true);
    });

    it('returns voiceover in any status', async () => {
      const user = createTestUser({ id: 'user_123' });

      for (const status of [
        'drafting',
        'generating_audio',
        'ready',
        'failed',
      ] as const) {
        const voiceover = createMockVoiceover({
          id: `voc_status${status}1234` as VoiceoverId,
          status,
          createdBy: user.id,
        });

        const mockRepo = createMockVoiceoverRepo(() =>
          Effect.succeed(voiceover),
        );
        const layers = Layer.mergeAll(mockRepo, MockDbLive);

        const result = await Effect.runPromise(
          withTestUser(user)(
            getVoiceover({ voiceoverId: voiceover.id }).pipe(
              Effect.provide(layers),
            ),
          ),
        );

        expect(result.status).toBe(status);
      }
    });
  });

  describe('error cases', () => {
    it('fails with VoiceoverNotFound when voiceover does not exist', async () => {
      const user = createTestUser({ id: 'user_123' });
      const nonExistentId = 'voc_nonexistent1234' as VoiceoverId;

      const mockRepo = createMockVoiceoverRepo((id) =>
        Effect.fail(new VoiceoverNotFound({ id })),
      );
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          getVoiceover({ voiceoverId: nonExistentId }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(VoiceoverNotFound);
        expect((error as VoiceoverNotFound).id).toBe(nonExistentId);
      }
    });
  });

  describe('retrieval behavior', () => {
    it('calls repository with correct voiceover ID', async () => {
      const user = createTestUser({ id: 'user_123' });
      const voiceoverId = 'voc_specific123456' as VoiceoverId;
      let capturedId: string | null = null;

      const mockRepo = createMockVoiceoverRepo((id) => {
        capturedId = id;
        return Effect.succeed(
          createMockVoiceover({
            id: voiceoverId,
            createdBy: user.id,
          }),
        );
      });
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      await Effect.runPromise(
        withTestUser(user)(
          getVoiceover({ voiceoverId }).pipe(Effect.provide(layers)),
        ),
      );

      expect(capturedId).toBe(voiceoverId);
    });

    it('returns voiceover owned by different user', async () => {
      // The getVoiceover use case does not perform authorization checks
      // It simply retrieves the voiceover by ID
      const requestingUser = createTestUser({ id: 'requesting-user-123' });
      const ownerId = 'owner-user-456';
      const voiceover = createMockVoiceover({
        id: 'voc_otheruser12345' as VoiceoverId,
        title: 'Other User Voiceover',
        createdBy: ownerId,
      });

      const mockRepo = createMockVoiceoverRepo(() => Effect.succeed(voiceover));
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(requestingUser)(
          getVoiceover({ voiceoverId: voiceover.id }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(result.id).toBe(voiceover.id);
      expect(result.createdBy).toBe(ownerId);
    });
  });
});
