import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { Queue, JobNotFoundError } from '@repo/queue';
import type { JobId, Job } from '@repo/db/schema';

// =============================================================================
// Types
// =============================================================================

export interface GetJobInput {
  jobId: string;
}

export type GetJobResult = Job;

// =============================================================================
// Use Case
// =============================================================================

/**
 * Get job status for polling.
 *
 * This use case:
 * 1. Retrieves the job by ID
 * 2. Verifies the job belongs to the current user
 * 3. Returns job status and result
 *
 * Used by the frontend to poll for generation completion.
 *
 * @example
 * const job = yield* getJob({ jobId: 'job_123' });
 * if (job.status === 'completed') {
 *   // Generation finished
 * }
 */
export const getJob = (input: GetJobInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const queue = yield* Queue;

    const job = yield* queue.getJob(input.jobId as JobId);

    // Verify job belongs to user
    if (job.createdBy !== user.id) {
      return yield* Effect.fail(new JobNotFoundError({ jobId: input.jobId }));
    }

    return job;
  }).pipe(
    Effect.withSpan('useCase.getInfographicJob', {
      attributes: { 'job.id': input.jobId },
    }),
  );
