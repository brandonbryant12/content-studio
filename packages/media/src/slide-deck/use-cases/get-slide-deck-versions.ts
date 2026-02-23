import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { SlideDeckRepo } from '../repos';

export interface GetSlideDeckVersionsInput {
  slideDeckId: string;
}

export const getSlideDeckVersions = (input: GetSlideDeckVersionsInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SlideDeckRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.slideDeckId,
      attributes: { 'slideDeck.id': input.slideDeckId },
    });

    yield* repo.findByIdForUser(input.slideDeckId, user.id);
    return yield* repo.listVersions(input.slideDeckId);
  }).pipe(withUseCaseSpan('useCase.getSlideDeckVersions'));
