import { Effect } from 'effect';
import type { InfographicSelection } from '@repo/db/schema';
import { InfographicRepo, SelectionRepo } from '../repos';
import { NotInfographicOwner, SelectionTextTooLong } from '../../errors';
import { MAX_SELECTION_LENGTH } from './add-selection';

// =============================================================================
// Types
// =============================================================================

export interface UpdateSelectionInput {
  infographicId: string;
  selectionId: string;
  userId: string;
  selectedText?: string;
  startOffset?: number;
  endOffset?: number;
  orderIndex?: number;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Update a selection's text or order.
 *
 * This use case:
 * 1. Validates the user owns the infographic
 * 2. Validates the selection exists and belongs to the infographic
 * 3. Enforces character limit if text is updated
 * 4. Updates the selection
 */
export const updateSelection = (input: UpdateSelectionInput) =>
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

    // Enforce character limit if text is being updated
    if (
      input.selectedText !== undefined &&
      input.selectedText.length > MAX_SELECTION_LENGTH
    ) {
      return yield* Effect.fail(
        new SelectionTextTooLong({
          textLength: input.selectedText.length,
          maxLength: MAX_SELECTION_LENGTH,
        }),
      );
    }

    // Update the selection
    const updated = yield* selectionRepo.update(input.selectionId, {
      selectedText: input.selectedText,
      startOffset: input.startOffset,
      endOffset: input.endOffset,
      orderIndex: input.orderIndex,
    });

    return updated;
  }).pipe(
    Effect.withSpan('useCase.updateSelection', {
      attributes: {
        'infographic.id': input.infographicId,
        'selection.id': input.selectionId,
      },
    }),
  );
