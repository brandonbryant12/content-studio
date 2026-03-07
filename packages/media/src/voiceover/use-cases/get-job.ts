import type { JobId } from '@repo/db/schema';
import type { Job } from '@repo/queue';
import { defineAuthedUseCase, getOwnedJobOrNotFound } from '../../shared';

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
export const getVoiceoverJob = defineAuthedUseCase<GetVoiceoverJobInput>()({
  name: 'useCase.getVoiceoverJob',
  span: ({ input }) => ({
    resourceId: input.jobId,
    attributes: { 'job.id': input.jobId },
  }),
  run: ({ input }) => getOwnedJobOrNotFound(input.jobId as JobId),
});
