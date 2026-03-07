import type { JobId } from '@repo/db/schema';
import { defineAuthedUseCase, getOwnedJobOrNotFound } from '../../shared';

// =============================================================================
// Types
// =============================================================================

export interface GetInfographicJobInput {
  jobId: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const getInfographicJob = defineAuthedUseCase<GetInfographicJobInput>()({
  name: 'useCase.getInfographicJob',
  span: ({ input }) => ({
    resourceId: input.jobId,
    attributes: { 'job.id': input.jobId },
  }),
  run: ({ input }) => getOwnedJobOrNotFound(input.jobId as JobId),
});
