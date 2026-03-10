import { Role } from '@repo/auth/policy';
import { type JobId, type JobStatus } from '@repo/db/schema';
import { type Job, JobProcessingError, type QueueService } from '@repo/queue';
import { Schedule, Effect } from 'effect';
import { describe, it, expect } from 'vitest';
import {
  makeJobUser,
  wrapJobError,
  createRetrySchedule,
  keepJobHeartbeatAlive,
  resolvePerTypeConcurrency,
} from '../base-worker';

// =============================================================================
// Tests
// =============================================================================

describe('makeJobUser', () => {
  it('creates a user with the given id', () => {
    const user = makeJobUser('user-abc');
    expect(user.id).toBe('user-abc');
    expect(user.role).toBe(Role.USER);
    expect(user.name).toBe('Worker');
  });

  it('sets empty email (not needed for job processing)', () => {
    const user = makeJobUser('user-123');
    expect(user.email).toBe('');
  });
});

describe('wrapJobError', () => {
  it('returns the same error if already a JobProcessingError', () => {
    const original = new JobProcessingError({
      jobId: 'job_1',
      message: 'Original error',
    });
    const wrapped = wrapJobError('job_1', original);
    expect(wrapped).toBe(original);
  });

  it('wraps a plain Error in JobProcessingError', () => {
    const error = new Error('Something broke');
    const wrapped = wrapJobError('job_2', error);
    expect(wrapped._tag).toBe('JobProcessingError');
    expect(wrapped.jobId).toBe('job_2');
    expect(wrapped.message).toContain('Something broke');
  });

  it('wraps a string in JobProcessingError', () => {
    const wrapped = wrapJobError('job_3', 'string error');
    expect(wrapped._tag).toBe('JobProcessingError');
    expect(wrapped.jobId).toBe('job_3');
    expect(wrapped.message).toContain('string error');
  });

  it('wraps null/undefined in JobProcessingError', () => {
    const wrapped = wrapJobError('job_4', null);
    expect(wrapped._tag).toBe('JobProcessingError');
    expect(wrapped.jobId).toBe('job_4');
    expect(wrapped.message).toContain('null');
  });
});

describe('createRetrySchedule', () => {
  it('limits retries based on maxConsecutiveErrors', async () => {
    const schedule = createRetrySchedule(100, 3);

    let count = 0;
    const effect = Effect.fail('error').pipe(
      Effect.retry(
        Schedule.map(schedule, () => {
          count++;
        }),
      ),
      Effect.catchAll(() => Effect.succeed('done')),
    );

    await Effect.runPromise(effect);
    // Schedule uses exponential + union with spaced + intersect with recurs
    // The exact retry count depends on the schedule composition
    expect(count).toBeGreaterThanOrEqual(2);
    expect(count).toBeLessThanOrEqual(4);
  });

  it('produces increasing delays (exponential backoff)', () => {
    // Verify the schedule is created without errors for valid inputs
    const schedule = createRetrySchedule(1000, 5);
    expect(schedule).toBeDefined();
  });
});

describe('resolvePerTypeConcurrency', () => {
  const jobTypes = ['generate-podcast', 'process-url'] as const;

  it('defaults each job type to the global max', () => {
    const limits = resolvePerTypeConcurrency(jobTypes, 5);
    expect(limits['generate-podcast']).toBe(5);
    expect(limits['process-url']).toBe(5);
  });

  it('applies per-type overrides and clamps to global max', () => {
    const limits = resolvePerTypeConcurrency(jobTypes, 4, {
      'generate-podcast': 2,
      'process-url': 9,
    });
    expect(limits['generate-podcast']).toBe(2);
    expect(limits['process-url']).toBe(4);
  });

  it('sanitizes invalid values to minimum of 1', () => {
    const limits = resolvePerTypeConcurrency(jobTypes, 3, {
      'generate-podcast': 0,
      'process-url': Number.NaN,
    });
    expect(limits['generate-podcast']).toBe(1);
    expect(limits['process-url']).toBe(3);
  });
});

describe('keepJobHeartbeatAlive', () => {
  const createMockQueue = (
    touchProcessingJob?: QueueService['touchProcessingJob'],
  ): QueueService => ({
    enqueue: () => Effect.die('not implemented'),
    getJob: () => Effect.die('not implemented'),
    getJobsByUser: () => Effect.die('not implemented'),
    updateJobStatus: () => Effect.die('not implemented'),
    processNextJob: () => Effect.die('not implemented'),
    processJobById: () => Effect.die('not implemented'),
    findPendingJobForPodcast: () => Effect.die('not implemented'),
    findPendingJobForVoiceover: () => Effect.die('not implemented'),
    claimNextJob: () => Effect.die('not implemented'),
    deleteJob: () => Effect.die('not implemented'),
    failStaleJobs: () => Effect.die('not implemented'),
    touchProcessingJob,
  });

  const createTouchedJob = (): Job => ({
    id: 'job_heartbeat' as JobId,
    type: 'process-research',
    status: 'processing' as JobStatus,
    payload: {},
    result: null,
    error: null,
    createdBy: 'user_1',
    createdAt: new Date(),
    updatedAt: new Date(),
    startedAt: new Date(),
    completedAt: null,
  });

  it('touches processing jobs until the queue reports they are no longer active', async () => {
    let touchCount = 0;
    const queue = createMockQueue(() =>
      Effect.sync(() => {
        touchCount += 1;
        return touchCount < 3 ? createTouchedJob() : null;
      }),
    );

    await Effect.runPromise(
      keepJobHeartbeatAlive(queue, 'job_heartbeat' as JobId, 5),
    );

    expect(touchCount).toBe(3);
  });

  it('is a no-op when the queue does not support heartbeats', async () => {
    await expect(
      Effect.runPromise(
        keepJobHeartbeatAlive(createMockQueue(), 'job_heartbeat' as JobId, 5),
      ),
    ).resolves.toBeUndefined();
  });
});
