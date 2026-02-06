import { Effect } from 'effect';
import type { JobId, JobStatus } from '@repo/db/schema';
import { Queue } from '@repo/queue';

// =============================================================================
// Types
// =============================================================================

export interface GetJobInput {
  jobId: JobId;
}

export interface GetJobResult {
  id: JobId;
  type: string;
  status: JobStatus;
  result: unknown;
  error: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Get a job by ID.
 *
 * This use case:
 * 1. Retrieves the job from the queue
 * 2. Returns raw job data for serialization in the handler
 *
 * @example
 * const job = yield* getJob({ jobId: 'job_123' as JobId });
 * // job.id, job.status, job.result, etc.
 */
export const getJob = (input: GetJobInput) =>
  Effect.gen(function* () {
    const queue = yield* Queue;
    return yield* queue.getJob(input.jobId);
  }).pipe(
    Effect.withSpan('useCase.getJob', {
      attributes: { 'job.id': input.jobId },
    }),
  );
