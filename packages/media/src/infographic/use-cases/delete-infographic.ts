import { Effect } from 'effect';
import { InfographicRepo } from '../repos';
import { NotInfographicOwner } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface DeleteInfographicInput {
  infographicId: string;
  userId: string;
}

export interface DeleteInfographicResult {
  deleted: boolean;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Delete an infographic.
 *
 * Validates that the user owns the infographic before deleting.
 * Cascade delete handled by FK constraint on selections.
 */
export const deleteInfographic = (input: DeleteInfographicInput) =>
  Effect.gen(function* () {
    const infographicRepo = yield* InfographicRepo;

    const existing = yield* infographicRepo.findById(input.infographicId);

    if (existing.createdBy !== input.userId) {
      return yield* Effect.fail(
        new NotInfographicOwner({
          infographicId: input.infographicId,
          userId: input.userId,
        }),
      );
    }

    // Cascade delete handled by FK constraint on selections
    yield* infographicRepo.delete(input.infographicId);

    return { deleted: true } as DeleteInfographicResult;
  }).pipe(
    Effect.withSpan('useCase.deleteInfographic', {
      attributes: { 'infographic.id': input.infographicId },
    }),
  );
