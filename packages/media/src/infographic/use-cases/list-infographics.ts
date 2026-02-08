import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
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

    return yield* repo.list({
      createdBy: user.id,
      limit: input.limit,
      offset: input.offset,
    });
  }).pipe(Effect.withSpan('useCase.listInfographics'));
