import { Effect } from 'effect';
import type { Infographic } from '@repo/db/schema';
import { InfographicRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface ListInfographicsInput {
  userId: string;
  limit?: number;
  offset?: number;
}

export interface ListInfographicsResult {
  items: readonly Infographic[];
  total: number;
  limit: number;
  offset: number;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * List infographics for a user with pagination.
 */
export const listInfographics = (input: ListInfographicsInput) =>
  Effect.gen(function* () {
    const infographicRepo = yield* InfographicRepo;

    const limit = input.limit ?? 20;
    const offset = input.offset ?? 0;

    const [infographics, total] = yield* Effect.all([
      infographicRepo.list({ createdBy: input.userId, limit, offset }),
      infographicRepo.count({ createdBy: input.userId }),
    ]);

    return {
      items: infographics,
      total,
      limit,
      offset,
    } as ListInfographicsResult;
  }).pipe(
    Effect.withSpan('useCase.listInfographics', {
      attributes: { 'user.id': input.userId },
    }),
  );
