import { Queue } from '@repo/queue';
import { Effect } from 'effect';
import type { JobId } from '@repo/db/schema';
import type { Job } from '@repo/queue';

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
    return yield* queue.getJob(input.jobId as JobId);
  }).pipe(
    Effect.withSpan('useCase.getVoiceoverJob', {
      attributes: { 'job.id': input.jobId },
    }),
  );
