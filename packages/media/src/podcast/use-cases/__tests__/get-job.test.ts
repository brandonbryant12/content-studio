import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetAllFactories } from '@repo/testing';
import type { JobId, JobStatus } from '@repo/db/schema';
import {
  Queue,
  type QueueService,
  type Job,
  JobNotFoundError,
} from '@repo/queue';
import { getJob } from '../get-job';

// =============================================================================
// Test Setup
// =============================================================================

interface MockState {
  jobs?: Map<string, Job>;
}

const createMockQueue = (state: MockState): Layer.Layer<Queue> => {
  const service: QueueService = {
    enqueue: () => Effect.die('not implemented'),
    getJob: (jobId) =>
      Effect.suspend(() => {
        const job = state.jobs?.get(jobId);
        if (!job) {
          return Effect.fail(new JobNotFoundError({ jobId }));
        }
        return Effect.succeed(job);
      }),
    getJobsByUser: () => Effect.die('not implemented'),
    updateJobStatus: () => Effect.die('not implemented'),
    processNextJob: () => Effect.die('not implemented'),
    processJobById: () => Effect.die('not implemented'),
    findPendingJobForPodcast: () => Effect.die('not implemented'),
    findPendingJobForVoiceover: () => Effect.die('not implemented'),
    findPendingJobForInfographic: () => Effect.succeed(null),
    deleteJob: () => Effect.die('not implemented'),
  };

  return Layer.succeed(Queue, service);
};

const createTestJob = (overrides?: Partial<Job>): Job => ({
  id: 'job_test123' as JobId,
  type: 'generate-podcast',
  status: 'pending' as JobStatus,
  payload: { podcastId: 'pod_123' },
  result: null,
  error: null,
  createdBy: 'user_123',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  startedAt: null,
  completedAt: null,
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('getJob', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('happy path', () => {
    it('returns job by ID', async () => {
      const job = createTestJob();
      const jobs = new Map([[job.id, job]]);

      const layers = createMockQueue({ jobs });

      const result = await Effect.runPromise(
        getJob({ jobId: job.id }).pipe(Effect.provide(layers)),
      );

      expect(result.id).toBe(job.id);
      expect(result.type).toBe('generate-podcast');
      expect(result.status).toBe('pending');
      expect(result.createdBy).toBe('user_123');
    });

    it('returns completed job with result', async () => {
      const job = createTestJob({
        status: 'completed',
        result: {
          scriptId: 'ver_123',
          segmentCount: 10,
          audioUrl: 'https://example.com/audio.mp3',
          duration: 300,
        },
        completedAt: new Date('2024-01-01T01:00:00Z'),
      });
      const jobs = new Map([[job.id, job]]);

      const layers = createMockQueue({ jobs });

      const result = await Effect.runPromise(
        getJob({ jobId: job.id }).pipe(Effect.provide(layers)),
      );

      expect(result.status).toBe('completed');
      expect(result.result).toEqual({
        scriptId: 'ver_123',
        segmentCount: 10,
        audioUrl: 'https://example.com/audio.mp3',
        duration: 300,
      });
      expect(result.completedAt).toEqual(new Date('2024-01-01T01:00:00Z'));
    });

    it('returns failed job with error', async () => {
      const job = createTestJob({
        status: 'failed',
        error: 'Generation failed: API error',
        completedAt: new Date('2024-01-01T01:00:00Z'),
      });
      const jobs = new Map([[job.id, job]]);

      const layers = createMockQueue({ jobs });

      const result = await Effect.runPromise(
        getJob({ jobId: job.id }).pipe(Effect.provide(layers)),
      );

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Generation failed: API error');
    });

    it('returns processing job with startedAt', async () => {
      const job = createTestJob({
        status: 'processing',
        startedAt: new Date('2024-01-01T00:30:00Z'),
      });
      const jobs = new Map([[job.id, job]]);

      const layers = createMockQueue({ jobs });

      const result = await Effect.runPromise(
        getJob({ jobId: job.id }).pipe(Effect.provide(layers)),
      );

      expect(result.status).toBe('processing');
      expect(result.startedAt).toEqual(new Date('2024-01-01T00:30:00Z'));
    });
  });

  describe('error handling', () => {
    it('fails when job not found', async () => {
      const layers = createMockQueue({ jobs: new Map() });

      const result = await Effect.runPromiseExit(
        getJob({ jobId: 'job_nonexistent' as JobId }).pipe(
          Effect.provide(layers),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(JobNotFoundError);
        expect((error as JobNotFoundError).jobId).toBe('job_nonexistent');
      }
    });
  });

  describe('all job types', () => {
    it('handles generate-podcast job', async () => {
      const job = createTestJob({ type: 'generate-podcast' });
      const jobs = new Map([[job.id, job]]);

      const layers = createMockQueue({ jobs });

      const result = await Effect.runPromise(
        getJob({ jobId: job.id }).pipe(Effect.provide(layers)),
      );

      expect(result.type).toBe('generate-podcast');
    });

    it('handles generate-audio job', async () => {
      const job = createTestJob({
        type: 'generate-audio',
        payload: { versionId: 'ver_123', userId: 'user_123' },
      });
      const jobs = new Map([[job.id, job]]);

      const layers = createMockQueue({ jobs });

      const result = await Effect.runPromise(
        getJob({ jobId: job.id }).pipe(Effect.provide(layers)),
      );

      expect(result.type).toBe('generate-audio');
    });
  });
});
