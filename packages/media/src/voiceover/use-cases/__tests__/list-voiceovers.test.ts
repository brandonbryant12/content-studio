import { describe, it, expect, beforeEach } from 'vitest';
import { Effect, Layer } from 'effect';
import { Db, type DbService } from '@repo/db/effect';
import type { Voiceover, VoiceoverId } from '@repo/db/schema';
import { createTestUser, withTestUser, resetAllFactories } from '@repo/testing';
import {
  VoiceoverRepo,
  type VoiceoverRepoService,
  type ListOptions,
} from '../../repos';
import { listVoiceovers } from '../list-voiceovers';

// =============================================================================
// Test Helpers
// =============================================================================

let voiceoverCounter = 0;

/**
 * Create a mock voiceover for testing.
 */
const createMockVoiceover = (overrides: Partial<Voiceover> = {}): Voiceover => {
  voiceoverCounter++;
  return {
    id: `voc_test${voiceoverCounter.toString().padStart(12, '0')}` as VoiceoverId,
    title: `Test Voiceover ${voiceoverCounter}`,
    text: 'Test voiceover text.',
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
  };
};

/**
 * Create a mock Db layer (not used since we mock the repo).
 */
const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as DbService['db'],
});

interface MockRepoState {
  voiceovers: Voiceover[];
}

/**
 * Create a mock VoiceoverRepo layer with state.
 */
const createMockVoiceoverRepo = (
  state: MockRepoState,
): Layer.Layer<VoiceoverRepo> => {
  const service: VoiceoverRepoService = {
    insert: () => Effect.die('Not implemented'),
    findById: () => Effect.die('Not implemented'),
    update: () => Effect.die('Not implemented'),
    delete: () => Effect.die('Not implemented'),
    updateStatus: () => Effect.die('Not implemented'),
    updateAudio: () => Effect.die('Not implemented'),
    clearAudio: () => Effect.die('Not implemented'),
    clearApproval: () => Effect.die('Not implemented'),
    setApproval: () => Effect.die('Not implemented'),

    list: (options: ListOptions) =>
      Effect.succeed(
        state.voiceovers
          .filter((v) =>
            options.userId ? v.createdBy === options.userId : true,
          )
          .slice(
            options.offset ?? 0,
            (options.offset ?? 0) + (options.limit ?? 50),
          ),
      ),

    count: (options?: ListOptions) =>
      Effect.succeed(
        state.voiceovers.filter((v) =>
          options?.userId ? v.createdBy === options.userId : true,
        ).length,
      ),
  };

  return Layer.succeed(VoiceoverRepo, service);
};

// =============================================================================
// Tests
// =============================================================================

describe('listVoiceovers', () => {
  beforeEach(() => {
    resetAllFactories();
    voiceoverCounter = 0;
  });

  describe('success cases', () => {
    it('returns paginated voiceovers for the current user', async () => {
      const user = createTestUser({ id: 'user_123' });
      const voiceovers = [
        createMockVoiceover({ createdBy: user.id }),
        createMockVoiceover({ createdBy: user.id }),
        createMockVoiceover({ createdBy: 'other-user' }),
      ];

      const mockRepo = createMockVoiceoverRepo({ voiceovers });
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(listVoiceovers({}).pipe(Effect.provide(layers))),
      );

      expect(result.voiceovers).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('returns empty list when user has no voiceovers', async () => {
      const user = createTestUser({ id: 'user_with_no_voiceovers' });
      const voiceovers = [createMockVoiceover({ createdBy: 'other-user' })];

      const mockRepo = createMockVoiceoverRepo({ voiceovers });
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(listVoiceovers({}).pipe(Effect.provide(layers))),
      );

      expect(result.voiceovers).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('pagination', () => {
    it('respects limit parameter', async () => {
      const user = createTestUser({ id: 'user_123' });
      const voiceovers = Array.from({ length: 10 }, () =>
        createMockVoiceover({ createdBy: user.id }),
      );

      const mockRepo = createMockVoiceoverRepo({ voiceovers });
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(
          listVoiceovers({ limit: 3 }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.voiceovers).toHaveLength(3);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('respects offset parameter', async () => {
      const user = createTestUser({ id: 'user_123' });
      const voiceovers = Array.from({ length: 10 }, (_, i) =>
        createMockVoiceover({
          id: `voc_indexed${i.toString().padStart(7, '0')}` as VoiceoverId,
          title: `Voiceover ${i}`,
          createdBy: user.id,
        }),
      );

      const mockRepo = createMockVoiceoverRepo({ voiceovers });
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(
          listVoiceovers({ limit: 3, offset: 5 }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.voiceovers).toHaveLength(3);
      expect(result.voiceovers[0]!.title).toBe('Voiceover 5');
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('hasMore is true when there are more voiceovers beyond offset+limit', async () => {
      const user = createTestUser({ id: 'user_123' });
      const voiceovers = Array.from({ length: 15 }, () =>
        createMockVoiceover({ createdBy: user.id }),
      );

      const mockRepo = createMockVoiceoverRepo({ voiceovers });
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(
          listVoiceovers({ limit: 5, offset: 5 }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.voiceovers).toHaveLength(5);
      expect(result.total).toBe(15);
      // offset(5) + returned(5) = 10, total = 15, so hasMore = true
      expect(result.hasMore).toBe(true);
    });

    it('hasMore is false when at the end of the list', async () => {
      const user = createTestUser({ id: 'user_123' });
      const voiceovers = Array.from({ length: 10 }, () =>
        createMockVoiceover({ createdBy: user.id }),
      );

      const mockRepo = createMockVoiceoverRepo({ voiceovers });
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(
          listVoiceovers({ limit: 5, offset: 5 }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.voiceovers).toHaveLength(5);
      expect(result.total).toBe(10);
      // offset(5) + returned(5) = 10, total = 10, so hasMore = false
      expect(result.hasMore).toBe(false);
    });

    it('uses default limit of 50 when not specified', async () => {
      const user = createTestUser({ id: 'user_123' });
      const voiceovers = Array.from({ length: 60 }, () =>
        createMockVoiceover({ createdBy: user.id }),
      );

      const mockRepo = createMockVoiceoverRepo({ voiceovers });
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(listVoiceovers({}).pipe(Effect.provide(layers))),
      );

      expect(result.voiceovers).toHaveLength(50);
      expect(result.total).toBe(60);
      expect(result.hasMore).toBe(true);
    });

    it('uses default offset of 0 when not specified', async () => {
      const user = createTestUser({ id: 'user_123' });
      const voiceovers = Array.from({ length: 5 }, (_, i) =>
        createMockVoiceover({
          id: `voc_indexed${i.toString().padStart(7, '0')}` as VoiceoverId,
          title: `Voiceover ${i}`,
          createdBy: user.id,
        }),
      );

      const mockRepo = createMockVoiceoverRepo({ voiceovers });
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(
          listVoiceovers({ limit: 3 }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.voiceovers[0]!.title).toBe('Voiceover 0');
    });
  });

  describe('edge cases', () => {
    it('handles empty database', async () => {
      const user = createTestUser({ id: 'user_123' });

      const mockRepo = createMockVoiceoverRepo({ voiceovers: [] });
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(listVoiceovers({}).pipe(Effect.provide(layers))),
      );

      expect(result.voiceovers).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('handles offset beyond total count', async () => {
      const user = createTestUser({ id: 'user_123' });
      const voiceovers = Array.from({ length: 5 }, () =>
        createMockVoiceover({ createdBy: user.id }),
      );

      const mockRepo = createMockVoiceoverRepo({ voiceovers });
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(
          listVoiceovers({ limit: 10, offset: 100 }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(result.voiceovers).toHaveLength(0);
      expect(result.total).toBe(5);
      expect(result.hasMore).toBe(false);
    });

    it('returns voiceovers with various statuses', async () => {
      const user = createTestUser({ id: 'user_123' });
      const voiceovers = [
        createMockVoiceover({ createdBy: user.id, status: 'drafting' }),
        createMockVoiceover({ createdBy: user.id, status: 'generating_audio' }),
        createMockVoiceover({ createdBy: user.id, status: 'ready' }),
        createMockVoiceover({ createdBy: user.id, status: 'failed' }),
      ];

      const mockRepo = createMockVoiceoverRepo({ voiceovers });
      const layers = Layer.mergeAll(mockRepo, MockDbLive);

      const result = await Effect.runPromise(
        withTestUser(user)(listVoiceovers({}).pipe(Effect.provide(layers))),
      );

      expect(result.voiceovers).toHaveLength(4);
      const statuses = result.voiceovers.map((v) => v.status);
      expect(statuses).toContain('drafting');
      expect(statuses).toContain('generating_audio');
      expect(statuses).toContain('ready');
      expect(statuses).toContain('failed');
    });
  });
});
