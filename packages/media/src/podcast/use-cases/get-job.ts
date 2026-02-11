import { Queue } from '@repo/queue';
import { Effect } from 'effect';
import type { JobId, JobStatus } from '@repo/db/schema';

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

export const getJob = (input: GetJobInput) =>
  Effect.gen(function* () {
    const queue = yield* Queue;
    return yield* queue.getJob(input.jobId);
  }).pipe(
    Effect.withSpan('useCase.getJob', {
      attributes: { 'job.id': input.jobId },
    }),
  );
