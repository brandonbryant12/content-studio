import { Effect } from 'effect';
import type { InfographicSelection } from '@repo/db/schema';
import { InfographicRepo, SelectionRepo } from '../repos';
import { NotInfographicOwner } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface ReorderSelectionsInput {
  infographicId: string;
  /** Array of selection IDs in the desired order */
  orderedSelectionIds: string[];
  userId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Reorder all selections for an infographic.
 *
 * This use case:
 * 1. Validates the user owns the infographic
 * 2. Updates all selection order indices based on array position
 * 3. Returns the reordered selections
 */
export const reorderSelections = (input: ReorderSelectionsInput) =>
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

    // Reorder selections (repo handles the transaction)
    const reordered = yield* selectionRepo.reorder(
      input.infographicId,
      input.orderedSelectionIds,
    );

    return reordered;
  }).pipe(
    Effect.withSpan('useCase.reorderSelections', {
      attributes: {
        'infographic.id': input.infographicId,
        'selection.count': input.orderedSelectionIds.length,
      },
    }),
  );
