import { Effect } from 'effect';
import { Queue } from '@repo/queue';
import type { JobId } from '@repo/db/schema';

// =============================================================================
// Types
// =============================================================================

export interface GetInfographicJobInput {
  jobId: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const getInfographicJob = (input: GetInfographicJobInput) =>
  Effect.gen(function* () {
    const queue = yield* Queue;
    return yield* queue.getJob(input.jobId as JobId);
  }).pipe(
    Effect.withSpan('useCase.getInfographicJob', {
      attributes: { 'job.id': input.jobId },
    }),
  );
