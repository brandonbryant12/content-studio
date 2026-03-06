import { type Job } from '@repo/queue';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import type { JobId, JobStatus } from '@repo/db/schema';
import type { JobProcessingError} from '@repo/queue';
import { defineJobHandler } from '../handlers/job-handler';

interface TestPayload {
  readonly resourceId: string;
}

const createTestJob = (
  overrides: Partial<Job<TestPayload>> = {},
): Job<TestPayload> => ({
  id: 'job_test123' as JobId,
  type: 'process-url',
  status: 'processing' as JobStatus,
  payload: {
    resourceId: 'resource-1',
  },
  result: null,
  error: null,
  createdBy: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  startedAt: new Date(),
  completedAt: null,
  ...overrides,
});

describe('defineJobHandler', () => {
  it('returns the underlying success result', async () => {
    const job = createTestJob();
    const handler = defineJobHandler<TestPayload>()({
      span: 'worker.test',
      errorMessage: 'Failed to run test job',
      attributes: (innerJob) => ({
        'resource.id': innerJob.payload.resourceId,
      }),
      run: () => Effect.succeed({ ok: true as const }),
    });

    const result = await Effect.runPromise(handler(job));

    expect(result).toEqual({ ok: true });
  });

  it('wraps failures in JobProcessingError with the configured message prefix', async () => {
    const job = createTestJob();
    const handler = defineJobHandler<TestPayload>()({
      span: 'worker.test',
      errorMessage: 'Failed to run test job',
      run: () => Effect.fail(new Error('boom')),
    });

    const exit = await Effect.runPromiseExit(handler(job));

    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      const error = exit.cause.error as JobProcessingError;
      expect(error._tag).toBe('JobProcessingError');
      expect(error.jobId).toBe(job.id);
      expect(error.message).toContain('Failed to run test job');
      expect(error.message).toContain('boom');
    }
  });
});
