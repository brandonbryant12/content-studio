import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTestUser,
  createTestPodcast,
  resetAllFactories,
} from '@repo/testing';
import type { Podcast, JobId, JobStatus, VersionStatus } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import { PodcastNotFound } from '../../../errors';
import { Queue, type QueueService, type Job } from '@repo/queue';
import { PodcastRepo, type PodcastRepoService } from '../../repos/podcast-repo';
import { startGeneration } from '../start-generation';

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
    onUpdateStatus?: (id: string, status: VersionStatus) => void;
  },
): Layer.Layer<PodcastRepo> => {
  const service: PodcastRepoService = {
    findById: (id: string) =>
      Effect.suspend(() =>
        state.podcast
          ? Effect.succeed({ ...state.podcast, documents: [] })
          : Effect.fail(new PodcastNotFound({ id })),
      ),
    list: () => Effect.die('not implemented'),
    insert: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    updateGenerationContext: () => Effect.die('not implemented'),
    verifyDocumentsExist: () => Effect.die('not implemented'),
    updateStatus: (id: string, status: VersionStatus) =>
      Effect.sync(() => {
        options?.onUpdateStatus?.(id, status);
        return { ...state.podcast!, status };
      }),
    updateScript: () => Effect.die('not implemented'),
    updateAudio: () => Effect.die('not implemented'),
    clearAudio: () => Effect.die('not implemented'),
    clearApproval: (id) =>
      Effect.sync(
        () =>
          ({
            ...state.podcast!,
            approvedBy: null,
            approvedAt: null,
          }) as Podcast,
      ),
    setApproval: (id, approvedBy) =>
      Effect.sync(
        () =>
          ({
            ...state.podcast!,
            approvedBy,
            approvedAt: new Date(),
          }) as Podcast,
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
          id: 'job_test123' as JobId,
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
    findPendingJobForVoiceover: () => Effect.die('not implemented'),
    deleteJob: () => Effect.die('not implemented'),
  };

  return Layer.succeed(Queue, service);
};

// =============================================================================
// Tests
// =============================================================================

describe('startGeneration', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('happy path', () => {
    it('enqueues generation job for podcast', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const enqueueSpy = vi.fn();
      const updateStatusSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo({ podcast }, { onUpdateStatus: updateStatusSpy }),
        createMockQueue({ podcast }, { onEnqueue: enqueueSpy }),
      );

      const result = await Effect.runPromise(
        startGeneration({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result.jobId).toBe('job_test123');
      expect(result.status).toBe('pending');
      expect(enqueueSpy).toHaveBeenCalledOnce();
      expect(enqueueSpy).toHaveBeenCalledWith(
        'generate-podcast',
        expect.objectContaining({
          podcastId: podcast.id,
          userId: user.id,
        }),
        user.id,
      );
    });

    it('includes prompt instructions in payload', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const enqueueSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo({ podcast }),
        createMockQueue({ podcast }, { onEnqueue: enqueueSpy }),
      );

      await Effect.runPromise(
        startGeneration({
          podcastId: podcast.id,
          promptInstructions: 'Make it funny',
        }).pipe(Effect.provide(layers)),
      );

      expect(enqueueSpy).toHaveBeenCalledWith(
        'generate-podcast',
        expect.objectContaining({
          promptInstructions: 'Make it funny',
        }),
        user.id,
      );
    });
  });

  describe('status handling', () => {
    it('updates podcast status to drafting', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({
        createdBy: user.id,
        status: 'ready',
      });
      const updateStatusSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo({ podcast }, { onUpdateStatus: updateStatusSpy }),
        createMockQueue({ podcast }),
      );

      await Effect.runPromise(
        startGeneration({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(updateStatusSpy).toHaveBeenCalledOnce();
      expect(updateStatusSpy).toHaveBeenCalledWith(podcast.id, 'drafting');
    });
  });

  describe('idempotency', () => {
    it('returns existing pending job instead of creating new one', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const existingJob: Job = {
        id: 'job_existing' as JobId,
        type: 'generate-podcast',
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
        startGeneration({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result.jobId).toBe('job_existing');
      expect(result.status).toBe('pending');
      expect(enqueueSpy).not.toHaveBeenCalled();
    });

    it('returns existing processing job', async () => {
      const user = createTestUser();
      const podcast = createTestPodcast({ createdBy: user.id });
      const existingJob: Job = {
        id: 'job_processing' as JobId,
        type: 'generate-podcast',
        status: 'processing',
        payload: { podcastId: podcast.id },
        result: null,
        error: null,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        completedAt: null,
      };

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockPodcastRepo({ podcast }),
        createMockQueue({ podcast, pendingJob: existingJob }),
      );

      const result = await Effect.runPromise(
        startGeneration({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      );

      expect(result.jobId).toBe('job_processing');
      expect(result.status).toBe('processing');
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
        startGeneration({ podcastId: 'pod_nonexistent' }).pipe(
          Effect.provide(layers),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(PodcastNotFound);
      }
    });
  });
});
