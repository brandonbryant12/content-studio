import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { InfographicRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface ListInfographicsInput {
  limit?: number;
  offset?: number;
}

// =============================================================================
// Use Case
// =============================================================================

export const listInfographics = (input: ListInfographicsInput = {}) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* InfographicRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      collection: 'infographics',
      attributes: {
        'owner.id': user.id,
        'pagination.limit': input.limit ?? 50,
        'pagination.offset': input.offset ?? 0,
      },
    });
    return yield* repo.list({
      createdBy: user.id,
      limit: input.limit,
      offset: input.offset,
    });
  }).pipe(withUseCaseSpan('useCase.listInfographics'));
