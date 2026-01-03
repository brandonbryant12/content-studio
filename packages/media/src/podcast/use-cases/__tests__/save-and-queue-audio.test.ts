import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTestUser,
  createTestPodcast,
  resetAllFactories,
} from '@repo/testing';
import type { Podcast, JobId, JobStatus } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import { PodcastNotFound } from '../../../errors';
import { Queue, type QueueService, type Job } from '@repo/queue';
import {
  PodcastRepo,
  type PodcastRepoService,
} from '../../repos/podcast-repo';
import {
  saveAndQueueAudio,
  NoChangesToSaveError,
} from '../save-and-queue-audio';
import { InvalidSaveError } from '../save-changes';

// =============================================================================
// Test Setup
// =============================================================================

// Mock Db layer (required by repo types)
const MockDbLive = Layer.succeed(Db, { db: {} as never });

interface MockState {
  podcast?: Podcast;
  pendingJob?: Job | null;
}

const createMockPodcastRepo = (
  state: MockState,
  options?: {
    onUpdate?: (id: string, data: Record<string, unknown>) => void;
  },
): Layer.Layer<PodcastRepo> => {
  const service: PodcastRepoService = {
    findById: (id) =>
      Effect.suspend(() =>
        state.podcast
          ? Effect.succeed({ ...state.podcast, documents: [] })
          : Effect.fail(new PodcastNotFound({ id })),
      ),
    findByIdFull: (id) =>
      Effect.suspend(() => {
        if (!state.podcast) {
          return Effect.fail(new PodcastNotFound({ id }));
        }
        return Effect.succeed({ ...state.podcast, documents: [] });
      }),
    list: () => Effect.die('not implemented'),
    insert: () => Effect.die('not implemented'),
    update: (id, data) =>
      Effect.sync(() => {
        options?.onUpdate?.(id, data as Record<string, unknown>);
        return { ...state.podcast!, ...data } as Podcast;
      }),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    updateGenerationContext: () => Effect.die('not implemented'),
    verifyDocumentsExist: () => Effect.die('not implemented'),
    updateStatus: (id, status) =>
      Effect.sync(() => ({ ...state.podcast!, status }) as Podcast),
    updateScript: (id, opts) =>
      Effect.sync(() => ({ ...state.podcast!, ...opts }) as Podcast),
    updateAudio: (id, opts) =>
      Effect.sync(() => ({ ...state.podcast!, ...opts }) as Podcast),
    clearAudio: (id) =>
      Effect.sync(
        () => ({ ...state.podcast!, audioUrl: null, duration: null }) as Podcast,
      ),
    clearApprovals: (id) =>
      Effect.sync(
        () => ({ ...state.podcast!, ownerHasApproved: false }) as Podcast,
      ),
  };

  return Layer.succeed(PodcastRepo, service);
};

const createMockQueue = (
  state: MockState,
  options?: {
    onEnqueue?: (type: string, payload: unknown, userId: string) => void;
  },
): Layer.Layer<Queue> => {
  const service: QueueService = {
    enqueue: (type, payload, userId) =>
      Effect.sync(() => {
        options?.onEnqueue?.(type, payload, userId);
        return {
          id: 'job_audio123' as JobId,
          type,
          status: 'pending' as JobStatus,
          payload,
          result: null,
          error: null,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          startedAt: null,
          completedAt: null,
        };
      }),
    getJob: () => Effect.die('not implemented'),
    getJobsByUser: () => Effect.die('not implemented'),
    updateJobStatus: () => Effect.die('not implemented'),
    processNextJob: () => Effect.die('not implemented'),
    processJobById: () => Effect.die('not implemented'),
    findPendingJobForPodcast: () => Effect.succeed(state.pendingJob ?? null),
    deleteJob: () => Effect.die('not implemented'),
  };

  return Layer.succeed(Queue, service);
};

// =============================================================================
// Tests
// =============================================================================

describe('saveAndQueueAudio', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('happy path', () => {
    it('saves changes and enqueues audio generation job', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        status: 'ready',
        segments: [{ speaker: 'Host', line: 'Original line', index: 0 }],
      });
      const enqueueSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo({ podcast }),
        createMockQueue({ podcast }, { onEnqueue: enqueueSpy }),
      );

      const result = await Effect.runPromise(
        saveAndQueueAudio({
          podcastId: podcast.id,
          segments: [{ speaker: 'Host', line: 'Updated line', index: 0 }],
        }).pipe(Effect.provide(layers)),
      );

      expect(result.jobId).toBe('job_audio123');
      expect(result.status).toBe('pending');
      expect(enqueueSpy).toHaveBeenCalledOnce();
      expect(enqueueSpy).toHaveBeenCalledWith(
        'generate-audio',
        expect.objectContaining({
          podcastId: podcast.id,
          userId: user.id,
        }),
        user.id,
      );
    });

    it('saves voice changes and enqueues job', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        status: 'ready',
        hostVoice: 'Kore',
      });
      const podcastUpdateSpy = vi.fn();
      const enqueueSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo({ podcast }, { onUpdate: podcastUpdateSpy }),
        createMockQueue({ podcast }, { onEnqueue: enqueueSpy }),
      );

      await Effect.runPromise(
        saveAndQueueAudio({
          podcastId: podcast.id,
          hostVoice: 'Puck',
          hostVoiceName: 'New Host',
        }).pipe(Effect.provide(layers)),
      );

      expect(podcastUpdateSpy).toHaveBeenCalledWith(
        podcast.id,
        expect.objectContaining({
          hostVoice: 'Puck',
          hostVoiceName: 'New Host',
        }),
      );
      expect(enqueueSpy).toHaveBeenCalledOnce();
    });
  });

  describe('idempotency', () => {
    it('returns existing pending job instead of creating new one', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        status: 'ready',
      });
      const existingJob: Job = {
        id: 'job_existing' as JobId,
        type: 'generate-audio',
        status: 'pending',
        payload: { podcastId: podcast.id },
        result: null,
        error: null,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null,
        completedAt: null,
      };
      const enqueueSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo({ podcast }),
        createMockQueue(
          { podcast, pendingJob: existingJob },
          { onEnqueue: enqueueSpy },
        ),
      );

      const result = await Effect.runPromise(
        saveAndQueueAudio({
          podcastId: podcast.id,
          hostVoice: 'Puck',
        }).pipe(Effect.provide(layers)),
      );

      expect(result.jobId).toBe('job_existing');
      expect(result.status).toBe('pending');
      expect(enqueueSpy).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('fails when podcast not found', async () => {
      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo({}),
        createMockQueue({}),
      );

      const result = await Effect.runPromiseExit(
        saveAndQueueAudio({
          podcastId: 'pod_nonexistent',
          segments: [{ speaker: 'Host', line: 'Test', index: 0 }],
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(PodcastNotFound);
      }
    });

    it('fails when status is not ready', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        status: 'drafting', // Not 'ready'
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo({ podcast }),
        createMockQueue({ podcast }),
      );

      const result = await Effect.runPromiseExit(
        saveAndQueueAudio({
          podcastId: podcast.id,
          segments: [{ speaker: 'Host', line: 'Test', index: 0 }],
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidSaveError);
        expect((error as InvalidSaveError).currentStatus).toBe('drafting');
      }
    });

    it('fails when no changes provided', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        status: 'ready',
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo({ podcast }),
        createMockQueue({ podcast }),
      );

      const result = await Effect.runPromiseExit(
        saveAndQueueAudio({
          podcastId: podcast.id,
          // No segments or voice changes
        }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(NoChangesToSaveError);
        expect((error as NoChangesToSaveError).podcastId).toBe(podcast.id);
      }
    });
  });

  describe('HTTP protocol', () => {
    it('NoChangesToSaveError has correct HTTP properties', () => {
      const error = new NoChangesToSaveError('pod_123');

      expect(NoChangesToSaveError.httpStatus).toBe(400);
      expect(NoChangesToSaveError.httpCode).toBe('NO_CHANGES');
      expect(NoChangesToSaveError.httpMessage).toBe('No changes to save');
      expect(NoChangesToSaveError.logLevel).toBe('silent');
      expect(NoChangesToSaveError.getData(error)).toEqual({
        podcastId: 'pod_123',
      });
    });
  });
});
