import { getCurrentUser } from '@repo/auth/policy';
import { type JobId } from '@repo/db/schema';
import { Effect } from 'effect';
import {
  annotateUseCaseSpan,
  getOwnedJobOrNotFound,
  withUseCaseSpan,
} from '../../shared';

export interface GetSlideDeckJobInput {
  jobId: string;
}

export const getSlideDeckJob = (input: GetSlideDeckJobInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.jobId,
      attributes: { 'job.id': input.jobId },
    });

    return yield* getOwnedJobOrNotFound(input.jobId as JobId);
  }).pipe(withUseCaseSpan('useCase.getSlideDeckJob'));
