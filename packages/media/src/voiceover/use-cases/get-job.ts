import { Effect } from 'effect';
import type { Job } from '@repo/queue';
import { Queue } from '@repo/queue';
import type { JobId } from '@repo/db/schema';

// =============================================================================
// Types
// =============================================================================

export interface GetVoiceoverJobInput {
  jobId: string;
}

export interface GetVoiceoverJobResult {
  id: string;
  type: string;
  status: Job['status'];
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
 * Get a voiceover generation job by ID.
 *
 * @example
 * const result = yield* getVoiceoverJob({ jobId: 'job_xxx' });
 */
export const getVoiceoverJob = (input: GetVoiceoverJobInput) =>
  Effect.gen(function* () {
    const queue = yield* Queue;
    const job = yield* queue.getJob(input.jobId as JobId);

    return {
      id: job.id,
      type: job.type,
      status: job.status,
      result: job.result,
      error: job.error,
      createdBy: job.createdBy,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }).pipe(
    Effect.withSpan('useCase.getVoiceoverJob', {
      attributes: { 'job.id': input.jobId },
    }),
  );
