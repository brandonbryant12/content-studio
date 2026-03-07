import type { JobId, JobStatus } from '@repo/db/schema';
import { defineAuthedUseCase, getOwnedJobOrNotFound } from '../../shared';

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

export const getJob = defineAuthedUseCase<GetJobInput>()({
  name: 'useCase.getJob',
  span: ({ input }) => ({
    resourceId: input.jobId,
    attributes: { 'job.id': input.jobId },
  }),
  run: ({ input }) => getOwnedJobOrNotFound(input.jobId),
});
