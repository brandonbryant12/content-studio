import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
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
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: user.id,
    });
    const repo = yield* InfographicRepo;

    return yield* repo.list({
      createdBy: user.id,
      limit: input.limit,
      offset: input.offset,
    });
  }).pipe(Effect.withSpan('useCase.listInfographics'));
