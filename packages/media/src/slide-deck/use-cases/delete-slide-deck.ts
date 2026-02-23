import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { SlideDeckRepo } from '../repos';

export interface DeleteSlideDeckInput {
  id: string;
}

export const deleteSlideDeck = (input: DeleteSlideDeckInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SlideDeckRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'slideDeck.id': input.id },
    });

    yield* repo.findByIdForUser(input.id, user.id);
    yield* repo.delete(input.id);
  }).pipe(withUseCaseSpan('useCase.deleteSlideDeck'));
