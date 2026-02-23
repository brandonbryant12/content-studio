import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { SlideDeckRepo } from '../repos';

export interface GetSlideDeckInput {
  id: string;
}

export const getSlideDeck = (input: GetSlideDeckInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SlideDeckRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'slideDeck.id': input.id },
    });

    return yield* repo.findByIdForUser(input.id, user.id);
  }).pipe(withUseCaseSpan('useCase.getSlideDeck'));
