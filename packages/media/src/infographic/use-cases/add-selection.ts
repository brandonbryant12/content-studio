import { Effect } from 'effect';
import type { InfographicSelection } from '@repo/db/schema';
import { InfographicRepo, SelectionRepo } from '../repos';
import { DocumentRepo } from '../../document';
import {
  NotInfographicOwner,
  DocumentNotFound,
  SelectionTextTooLong,
} from '../../errors';

// =============================================================================
// Constants
// =============================================================================

/** Maximum characters per selection */
export const MAX_SELECTION_LENGTH = 500;

/** Soft limit for number of selections (warning threshold) */
export const SELECTION_SOFT_LIMIT = 10;

// =============================================================================
// Types
// =============================================================================

export interface AddSelectionInput {
  infographicId: string;
  documentId: string;
  selectedText: string;
  startOffset?: number;
  endOffset?: number;
  userId: string;
}

export interface AddSelectionResult {
  selection: InfographicSelection;
  /** Warning message if approaching or exceeding soft limit */
  warningMessage?: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Add a text selection to an infographic.
 *
 * This use case:
 * 1. Validates the user owns the infographic
 * 2. Validates the document exists and is owned by user
 * 3. Enforces character limit (500 chars)
 * 4. Adds selection with next order index
 * 5. Returns warning if > 10 selections
 */
export const addSelection = (input: AddSelectionInput) =>
  Effect.gen(function* () {
    const infographicRepo = yield* InfographicRepo;
    const selectionRepo = yield* SelectionRepo;
    const documentRepo = yield* DocumentRepo;

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

    // Validate document exists and is owned by user
    const document = yield* documentRepo.findById(input.documentId);
    if (document.createdBy !== input.userId) {
      return yield* Effect.fail(new DocumentNotFound({ id: input.documentId }));
    }

    // Enforce character limit
    if (input.selectedText.length > MAX_SELECTION_LENGTH) {
      return yield* Effect.fail(
        new SelectionTextTooLong({
          textLength: input.selectedText.length,
          maxLength: MAX_SELECTION_LENGTH,
        }),
      );
    }

    // Get current selection count for order index
    const currentCount = yield* selectionRepo.count(input.infographicId);

    // Insert selection with next order index
    const selection = yield* selectionRepo.insert({
      infographicId: infographic.id,
      documentId: document.id,
      selectedText: input.selectedText,
      startOffset: input.startOffset,
      endOffset: input.endOffset,
      orderIndex: currentCount,
    });

    // Build result with optional warning
    const result: AddSelectionResult = { selection };

    const newCount = currentCount + 1;
    if (newCount > SELECTION_SOFT_LIMIT) {
      result.warningMessage = `You have ${newCount} selections. Consider consolidating to keep your infographic focused.`;
    }

    return result;
  }).pipe(
    Effect.withSpan('useCase.addSelection', {
      attributes: {
        'infographic.id': input.infographicId,
        'document.id': input.documentId,
        'selection.textLength': input.selectedText.length,
      },
    }),
  );
