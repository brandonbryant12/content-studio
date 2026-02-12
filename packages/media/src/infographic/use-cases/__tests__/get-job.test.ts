import {
  Queue,
  type QueueService,
  type Job,
  JobNotFoundError,
} from '@repo/queue';
import { resetAllFactories } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { JobId, JobStatus } from '@repo/db/schema';
import { getInfographicJob } from '../get-job';

// =============================================================================
// Test Helpers
// =============================================================================

const createMockQueue = (jobs: Map<string, Job>): Layer.Layer<Queue> => {
  const service: QueueService = {
    enqueue: () => Effect.die('not implemented'),
    getJob: (jobId) =>
      Effect.suspend(() => {
        const job = jobs.get(jobId);
        if (!job) return Effect.fail(new JobNotFoundError({ jobId }));
        return Effect.succeed(job);
      }),
    getJobsByUser: () => Effect.die('not implemented'),
    updateJobStatus: () => Effect.die('not implemented'),
    processNextJob: () => Effect.die('not implemented'),
    processJobById: () => Effect.die('not implemented'),
    findPendingJobForPodcast: () => Effect.die('not implemented'),
    findPendingJobForVoiceover: () => Effect.die('not implemented'),
    deleteJob: () => Effect.die('not implemented'),
    claimNextJob: () => Effect.die('not implemented'),
    failStaleJobs: () => Effect.die('not implemented'),
  };

  return Layer.succeed(Queue, service);
};

const createTestJob = (overrides?: Partial<Job>): Job => ({
  id: 'job_infg_test123' as JobId,
  type: 'generate-infographic',
  status: 'pending' as JobStatus,
  payload: { infographicId: 'infg_123', userId: 'user_123' },
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

describe('getInfographicJob', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns job by ID', async () => {
    const job = createTestJob();
    const jobs = new Map([[job.id, job]]);

    const result = await Effect.runPromise(
      getInfographicJob({ jobId: job.id }).pipe(
        Effect.provide(createMockQueue(jobs)),
      ),
    );

    expect(result.id).toBe(job.id);
    expect(result.type).toBe('generate-infographic');
    expect(result.status).toBe('pending');
  });

  it('returns completed job with result', async () => {
    const job = createTestJob({
      status: 'completed',
      result: { imageUrl: 'https://example.com/img.png' },
      completedAt: new Date('2024-01-01T01:00:00Z'),
    });
    const jobs = new Map([[job.id, job]]);

    const result = await Effect.runPromise(
      getInfographicJob({ jobId: job.id }).pipe(
        Effect.provide(createMockQueue(jobs)),
      ),
    );

    expect(result.status).toBe('completed');
    expect(result.completedAt).toEqual(new Date('2024-01-01T01:00:00Z'));
  });

  it('returns failed job with error', async () => {
    const job = createTestJob({
      status: 'failed',
      error: 'Image generation failed',
    });
    const jobs = new Map([[job.id, job]]);

    const result = await Effect.runPromise(
      getInfographicJob({ jobId: job.id }).pipe(
        Effect.provide(createMockQueue(jobs)),
      ),
    );

    expect(result.status).toBe('failed');
    expect(result.error).toBe('Image generation failed');
  });

  it('fails with JobNotFoundError when job does not exist', async () => {
    const jobs = new Map<string, Job>();

    const result = await Effect.runPromiseExit(
      getInfographicJob({ jobId: 'job_nonexistent' }).pipe(
        Effect.provide(createMockQueue(jobs)),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error).toBeInstanceOf(JobNotFoundError);
    }
  });
});
