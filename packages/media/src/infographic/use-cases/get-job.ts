import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { JobId } from '@repo/db/schema';
import { annotateUseCaseSpan, getOwnedJobOrNotFound } from '../../shared';

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
    const user = yield* getCurrentUser;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.jobId,
      attributes: { 'job.id': input.jobId },
    });
    return yield* getOwnedJobOrNotFound(input.jobId as JobId);
  }).pipe(Effect.withSpan('useCase.getInfographicJob'));
