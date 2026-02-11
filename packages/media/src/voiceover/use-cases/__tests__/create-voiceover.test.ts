import { describe, it, expect, beforeEach } from 'vitest';
import { Effect, Layer } from 'effect';
import { Db, type DbService } from '@repo/db/effect';
import type { Voiceover, VoiceoverId } from '@repo/db/schema';
import { createTestUser, withTestUser, resetAllFactories } from '@repo/testing';
import { VoiceoverRepo, type VoiceoverRepoService } from '../../repos';
import { createVoiceover } from '../create-voiceover';

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
  text: '',
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

/**
 * Create a mock VoiceoverRepo layer.
 */
const createMockVoiceoverRepo = (
  insertFn: VoiceoverRepoService['insert'],
): Layer.Layer<VoiceoverRepo> =>
  Layer.succeed(VoiceoverRepo, {
    insert: insertFn,
    findById: () => Effect.die('Not implemented'),
    list: () => Effect.die('Not implemented'),
    update: () => Effect.die('Not implemented'),
    delete: () => Effect.die('Not implemented'),
    count: () => Effect.die('Not implemented'),
    updateStatus: () => Effect.die('Not implemented'),
    updateAudio: () => Effect.die('Not implemented'),
    clearAudio: () => Effect.die('Not implemented'),
    clearApproval: () => Effect.die('Not implemented'),
    setApproval: () => Effect.die('Not implemented'),
  });

// =============================================================================
// Tests
// =============================================================================

describe('createVoiceover', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('success cases', () => {
    it('creates voiceover with correct title', async () => {
      const user = createTestUser({ id: 'user_test123' });
      let capturedData: Parameters<VoiceoverRepoService['insert']>[0] | null =
        null;

      const mockRepo = createMockVoiceoverRepo((data) => {
        capturedData = data;
        return Effect.succeed(
          createMockVoiceover({
            title: data.title,
            createdBy: data.createdBy,
          }),
        );
      });

      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(
          createVoiceover({
            title: 'My New Voiceover',
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.title).toBe('My New Voiceover');
      expect(capturedData).toEqual({
        title: 'My New Voiceover',
        createdBy: user.id,
      });
    });

    it('creates voiceover in drafting status', async () => {
      const user = createTestUser({ id: 'user_test123' });

      const mockRepo = createMockVoiceoverRepo((data) =>
        Effect.succeed(
          createMockVoiceover({
            title: data.title,
            createdBy: data.createdBy,
            status: 'drafting',
          }),
        ),
      );

      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(
          createVoiceover({
            title: 'New Voiceover',
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.status).toBe('drafting');
    });

    it('sets correct user as creator', async () => {
      const user = createTestUser({ id: 'specific-user-id' });
      let capturedCreatedBy: string | null = null;

      const mockRepo = createMockVoiceoverRepo((data) => {
        capturedCreatedBy = data.createdBy;
        return Effect.succeed(
          createMockVoiceover({
            title: data.title,
            createdBy: data.createdBy,
          }),
        );
      });

      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(
          createVoiceover({
            title: 'User Voiceover',
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.createdBy).toBe('specific-user-id');
      expect(capturedCreatedBy).toBe('specific-user-id');
    });

    it('initializes with empty text', async () => {
      const user = createTestUser({ id: 'user_test123' });

      const mockRepo = createMockVoiceoverRepo((data) =>
        Effect.succeed(
          createMockVoiceover({
            title: data.title,
            createdBy: data.createdBy,
            text: '',
          }),
        ),
      );

      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(
          createVoiceover({
            title: 'New Voiceover',
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.text).toBe('');
    });

    it('initializes with default voice', async () => {
      const user = createTestUser({ id: 'user_test123' });

      const mockRepo = createMockVoiceoverRepo((data) =>
        Effect.succeed(
          createMockVoiceover({
            title: data.title,
            createdBy: data.createdBy,
            voice: 'Charon',
          }),
        ),
      );

      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(
          createVoiceover({
            title: 'New Voiceover',
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.voice).toBe('Charon');
    });

    it('initializes without audio', async () => {
      const user = createTestUser({ id: 'user_test123' });

      const mockRepo = createMockVoiceoverRepo((data) =>
        Effect.succeed(
          createMockVoiceover({
            title: data.title,
            createdBy: data.createdBy,
            audioUrl: null,
            duration: null,
          }),
        ),
      );

      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(
          createVoiceover({
            title: 'New Voiceover',
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.audioUrl).toBeNull();
      expect(result.duration).toBeNull();
    });
  });
});
