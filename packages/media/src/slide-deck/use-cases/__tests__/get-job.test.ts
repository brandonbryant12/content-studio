import {
  Queue,
  JobNotFoundError,
  type Job,
  type QueueService,
} from '@repo/queue';
import {
  createTestAdmin,
  createTestUser,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JobId, JobStatus } from '@repo/db/schema';
import { getSlideDeckJob } from '../get-job';

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
  id: 'job_sld_test123' as JobId,
  type: 'generate-slide-deck',
  status: 'pending' as JobStatus,
  payload: { slideDeckId: 'sld_123', userId: 'user_123' },
  result: null,
  error: null,
  createdBy: 'user_123',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  startedAt: null,
  completedAt: null,
  ...overrides,
});

describe('getSlideDeckJob', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns an owned job by id', async () => {
    const user = createTestUser({ id: 'user_123' });
    const job = createTestJob();
    const jobs = new Map([[job.id, job]]);

    const result = await Effect.runPromise(
      withTestUser(user)(
        getSlideDeckJob({ jobId: job.id }).pipe(
          Effect.provide(createMockQueue(jobs)),
        ),
      ),
    );

    expect(result.id).toBe(job.id);
    expect(result.type).toBe('generate-slide-deck');
    expect(result.status).toBe('pending');
  });

  it('returns a completed job with slide-deck result', async () => {
    const user = createTestUser({ id: 'user_123' });
    const job = createTestJob({
      status: 'completed',
      result: {
        slideDeckId: 'sld_123',
        versionNumber: 2,
        slideCount: 9,
      },
      completedAt: new Date('2024-01-01T01:00:00Z'),
    });
    const jobs = new Map([[job.id, job]]);

    const result = await Effect.runPromise(
      withTestUser(user)(
        getSlideDeckJob({ jobId: job.id }).pipe(
          Effect.provide(createMockQueue(jobs)),
        ),
      ),
    );

    expect(result.status).toBe('completed');
    expect(result.result).toEqual({
      slideDeckId: 'sld_123',
      versionNumber: 2,
      slideCount: 9,
    });
  });

  it('fails with JobNotFoundError when missing', async () => {
    const user = createTestUser();

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        getSlideDeckJob({ jobId: 'job_missing' }).pipe(
          Effect.provide(createMockQueue(new Map())),
        ),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('JobNotFoundError');
      expect((error as JobNotFoundError).jobId).toBe('job_missing');
    }
  });

  it('fails for non-owner users', async () => {
    const user = createTestUser({ id: 'user_999' });
    const job = createTestJob({ createdBy: 'user_123' });

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        getSlideDeckJob({ jobId: job.id }).pipe(
          Effect.provide(createMockQueue(new Map([[job.id, job]]))),
        ),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('JobNotFoundError');
    }
  });

  it('allows admins to fetch jobs from other users', async () => {
    const admin = createTestAdmin();
    const job = createTestJob({ createdBy: 'user_123' });

    const result = await Effect.runPromise(
      withTestUser(admin)(
        getSlideDeckJob({ jobId: job.id }).pipe(
          Effect.provide(createMockQueue(new Map([[job.id, job]]))),
        ),
      ),
    );

    expect(result.id).toBe(job.id);
  });
});
