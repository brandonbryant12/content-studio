import { getCurrentUser } from '@repo/auth/policy';
import { type JobId, type JobStatus } from '@repo/db/schema';
import { Effect } from 'effect';
import type { GenerateSlideDeckPayload } from '@repo/queue';
import {
  annotateUseCaseSpan,
  enqueueJob,
  withTransactionalStateAndEnqueue,
  withUseCaseSpan,
} from '../../shared';
import { SlideDeckRepo } from '../repos';

export interface GenerateSlideDeckInput {
  id: string;
}

export interface GenerateSlideDeckResult {
  jobId: JobId;
  status: JobStatus;
}

export const generateSlideDeck = (input: GenerateSlideDeckInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SlideDeckRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'slideDeck.id': input.id },
    });

    const existing = yield* repo.findByIdForUser(input.id, user.id);

    const payload: GenerateSlideDeckPayload = {
      slideDeckId: input.id,
      userId: existing.createdBy,
    };

    const job = yield* withTransactionalStateAndEnqueue(
      Effect.gen(function* () {
        yield* repo.update(input.id, {
          status: 'generating',
          errorMessage: null,
        });

        return yield* enqueueJob({
          type: 'generate-slide-deck',
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
  }).pipe(withUseCaseSpan('useCase.generateSlideDeck'));
