import { Effect } from 'effect';
import type { JobId } from '@repo/db/schema';
import { getOwnedJobOrNotFound } from '../../shared';

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
    return yield* getOwnedJobOrNotFound(input.jobId as JobId);
  }).pipe(
    Effect.withSpan('useCase.getInfographicJob', {
      attributes: { 'job.id': input.jobId },
    }),
  );
