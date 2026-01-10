import { Effect } from 'effect';
import type { InfographicFull } from '../repos';
import { InfographicRepo } from '../repos';
import { NotInfographicOwner } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface GetInfographicInput {
  infographicId: string;
  userId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Get an infographic by ID with selections.
 *
 * Validates that the user owns the infographic.
 */
export const getInfographic = (input: GetInfographicInput) =>
  Effect.gen(function* () {
    const infographicRepo = yield* InfographicRepo;

    const infographic = yield* infographicRepo.findByIdFull(input.infographicId);

    if (infographic.createdBy !== input.userId) {
      return yield* Effect.fail(
        new NotInfographicOwner({
          infographicId: input.infographicId,
          userId: input.userId,
        }),
      );
    }

    return infographic;
  }).pipe(
    Effect.withSpan('useCase.getInfographic', {
      attributes: { 'infographic.id': input.infographicId },
    }),
  );
