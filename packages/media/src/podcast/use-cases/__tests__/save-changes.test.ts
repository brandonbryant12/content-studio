import { ForbiddenError } from '@repo/auth';
import { Db } from '@repo/db/effect';
import {
  createTestUser,
  createTestPodcast,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Podcast } from '@repo/db/schema';
import { PodcastNotFound } from '../../../errors';
import {
  PodcastRepo,
  type PodcastRepoService,
  type PodcastWithDocuments,
} from '../../repos/podcast-repo';
import { saveChanges, InvalidSaveError } from '../save-changes';

// =============================================================================
// Test Helpers
// =============================================================================

interface MockState {
  podcasts: Map<string, Podcast>;
}

const createMockPodcastRepo = (
  state: MockState,
  spies?: {
    onUpdate?: (id: string, data: Record<string, unknown>) => void;
    onUpdateScript?: (id: string, data: Record<string, unknown>) => void;
    onClearAudio?: (id: string) => void;
    onClearApproval?: (id: string) => void;
    onUpdateStatus?: (id: string, status: string) => void;
  },
): Layer.Layer<PodcastRepo> => {
  const service: PodcastRepoService = {
    insert: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    verifyDocumentsExist: () => Effect.die('not implemented'),
    updateGenerationContext: () => Effect.die('not implemented'),
    updateAudio: () => Effect.die('not implemented'),
    setApproval: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),

    findById: (id: string) =>
      Effect.suspend(() => {
        const podcast = state.podcasts.get(id);
        if (!podcast) return Effect.fail(new PodcastNotFound({ id }));
        return Effect.succeed({
          ...podcast,
          documents: [],
        } as PodcastWithDocuments);
      }),

    update: (id: string, data) => {
      spies?.onUpdate?.(id, data as Record<string, unknown>);
      const podcast = state.podcasts.get(id);
      return Effect.succeed({ ...podcast!, ...data } as Podcast);
    },

    updateScript: (id: string, data) => {
      spies?.onUpdateScript?.(id, data as Record<string, unknown>);
      return Effect.succeed(state.podcasts.get(id)!);
    },

    updateStatus: (id: string, status) => {
      spies?.onUpdateStatus?.(id, status);
      const podcast = state.podcasts.get(id);
      return Effect.succeed({ ...podcast!, status } as Podcast);
    },

    clearAudio: (id: string) => {
      spies?.onClearAudio?.(id);
      return Effect.succeed(state.podcasts.get(id)!);
    },

    clearApproval: (id: string) => {
      spies?.onClearApproval?.(id);
      return Effect.succeed(state.podcasts.get(id)!);
    },
  };

  return Layer.succeed(PodcastRepo, service);
};

const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, { db: {} as never });

// =============================================================================
// Tests
// =============================================================================

describe('saveChanges', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('success cases', () => {
    it('saves segment changes and transitions to script_ready', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        status: 'ready',
      });
      const state: MockState = {
        podcasts: new Map([[podcast.id, podcast]]),
      };

      const updateStatusSpy = vi.fn();
      const clearAudioSpy = vi.fn();
      const clearApprovalSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(state, {
          onUpdateStatus: updateStatusSpy,
          onClearAudio: clearAudioSpy,
          onClearApproval: clearApprovalSpy,
        }),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          saveChanges({
            podcastId: podcast.id,
            segments: [{ speaker: 'Host', line: 'Hello', index: 0 }],
          }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result.hasChanges).toBe(true);
      expect(updateStatusSpy).toHaveBeenCalledWith(podcast.id, 'script_ready');
      expect(clearAudioSpy).toHaveBeenCalledWith(podcast.id);
      expect(clearApprovalSpy).toHaveBeenCalledWith(podcast.id);
    });

    it('saves voice changes', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        status: 'ready',
      });
      const state: MockState = {
        podcasts: new Map([[podcast.id, podcast]]),
      };

      const updateSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo(state, { onUpdate: updateSpy }),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          saveChanges({
            podcastId: podcast.id,
            hostVoice: 'Kore',
            hostVoiceName: 'Kore',
          }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result.hasChanges).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(podcast.id, {
        hostVoice: 'Kore',
        hostVoiceName: 'Kore',
      });
    });

    it('returns hasChanges=false when no changes provided', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        status: 'ready',
      });
      const state: MockState = {
        podcasts: new Map([[podcast.id, podcast]]),
      };

      const layers = Layer.mergeAll(MockDbLive, createMockPodcastRepo(state));

      const result = await Effect.runPromise(
        withTestUser(user)(saveChanges({ podcastId: podcast.id })).pipe(
          Effect.provide(layers),
        ),
      );

      expect(result.hasChanges).toBe(false);
      expect(result.podcast.id).toBe(podcast.id);
    });
  });

  describe('authorization', () => {
    it('fails with ForbiddenError when non-owner tries to save', async () => {
      const user = createTestUser();
      const otherUser = createTestUser();
      const podcast = createTestPodcast({
        createdBy: otherUser.id,
        status: 'ready',
      });
      const state: MockState = {
        podcasts: new Map([[podcast.id, podcast]]),
      };

      const layers = Layer.mergeAll(MockDbLive, createMockPodcastRepo(state));

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          saveChanges({
            podcastId: podcast.id,
            segments: [{ speaker: 'Host', line: 'Hacked', index: 0 }],
          }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(ForbiddenError);
      }
    });
  });

  describe('error cases', () => {
    it('fails with InvalidSaveError when status is not ready', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        status: 'generating_audio',
      });
      const state: MockState = {
        podcasts: new Map([[podcast.id, podcast]]),
      };

      const layers = Layer.mergeAll(MockDbLive, createMockPodcastRepo(state));

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          saveChanges({
            podcastId: podcast.id,
            segments: [{ speaker: 'Host', line: 'Test', index: 0 }],
          }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidSaveError);
        expect((error as InvalidSaveError).podcastId).toBe(podcast.id);
        expect((error as InvalidSaveError).currentStatus).toBe(
          'generating_audio',
        );
      }
    });

    it('fails with PodcastNotFound when podcast does not exist', async () => {
      const user = createTestUser();
      const state: MockState = { podcasts: new Map() };

      const layers = Layer.mergeAll(MockDbLive, createMockPodcastRepo(state));

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          saveChanges({
            podcastId: 'pod_nonexistent',
            segments: [{ speaker: 'Host', line: 'Test', index: 0 }],
          }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(PodcastNotFound);
      }
    });

    it('InvalidSaveError has correct HTTP properties', () => {
      expect(InvalidSaveError.httpStatus).toBe(409);
      expect(InvalidSaveError.httpCode).toBe('INVALID_SAVE');
    });
  });
});
