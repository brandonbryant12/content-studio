import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { SlideDeckRepo } from '../repos';

export interface ListSlideDecksInput {
  limit?: number;
  offset?: number;
}

export const listSlideDecks = (input: ListSlideDecksInput = {}) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* SlideDeckRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: user.id,
      attributes: {
        'pagination.limit': input.limit ?? 50,
        'pagination.offset': input.offset ?? 0,
      },
    });

    return yield* repo.list({
      createdBy: user.id,
      limit: input.limit,
      offset: input.offset,
    });
  }).pipe(withUseCaseSpan('useCase.listSlideDecks'));
