import { Effect } from 'effect';
import { InfographicRepo, SelectionRepo } from '../repos';
import { NotInfographicOwner } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface RemoveSelectionInput {
  infographicId: string;
  selectionId: string;
  userId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Remove a selection from an infographic.
 *
 * This use case:
 * 1. Validates the user owns the infographic
 * 2. Validates the selection exists and belongs to the infographic
 * 3. Deletes the selection
 */
export const removeSelection = (input: RemoveSelectionInput) =>
  Effect.gen(function* () {
    const infographicRepo = yield* InfographicRepo;
    const selectionRepo = yield* SelectionRepo;

    // Validate infographic exists and is owned by user
    const infographic = yield* infographicRepo.findById(input.infographicId);
    if (infographic.createdBy !== input.userId) {
      return yield* Effect.fail(
        new NotInfographicOwner({
          infographicId: input.infographicId,
          userId: input.userId,
        }),
      );
    }

    // Validate selection exists (will fail with InfographicSelectionNotFound if not)
    const selection = yield* selectionRepo.findById(input.selectionId);

    // Verify selection belongs to this infographic
    if (selection.infographicId !== input.infographicId) {
      return yield* Effect.fail(
        new NotInfographicOwner({
          infographicId: input.infographicId,
          userId: input.userId,
          message: 'Selection does not belong to this infographic',
        }),
      );
    }

    // Delete the selection
    yield* selectionRepo.delete(input.selectionId);

    return { deleted: true };
  }).pipe(
    Effect.withSpan('useCase.removeSelection', {
      attributes: {
        'infographic.id': input.infographicId,
        'selection.id': input.selectionId,
      },
    }),
  );
