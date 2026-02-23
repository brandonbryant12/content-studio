import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { JobId, JobStatus } from '@repo/db/schema';
import type { GenerateInfographicPayload } from '@repo/queue';
import {
  annotateUseCaseSpan,
  enqueueJob,
  withTransactionalStateAndEnqueue,
  withUseCaseSpan,
} from '../../shared';
import { InfographicRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface GenerateInfographicInput {
  id: string;
}

export interface GenerateInfographicResult {
  jobId: JobId;
  status: JobStatus;
}

// =============================================================================
// Use Case
// =============================================================================

export const generateInfographic = (input: GenerateInfographicInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* InfographicRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'infographic.id': input.id },
    });
    const existing = yield* repo.findByIdForUser(input.id, user.id);

    // Enqueue job
    const payload: GenerateInfographicPayload = {
      infographicId: input.id,
      userId: existing.createdBy,
    };

    const job = yield* withTransactionalStateAndEnqueue(
      Effect.gen(function* () {
        yield* repo.update(input.id, {
          status: 'generating',
          errorMessage: null,
        });
        return yield* enqueueJob({
          type: 'generate-infographic',
          payload,
          userId: existing.createdBy,
        });
      }),
      () =>
        repo.update(input.id, {
          status: existing.status,
          errorMessage: existing.errorMessage,
        }),
    );

    return {
      jobId: job.id,
      status: job.status,
    };
  }).pipe(withUseCaseSpan('useCase.generateInfographic'));
