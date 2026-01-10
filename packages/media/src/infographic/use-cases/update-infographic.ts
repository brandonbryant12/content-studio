import { Effect } from 'effect';
import type { Infographic, InfographicStyleOptions } from '@repo/db/schema';
import { InfographicRepo } from '../repos';
import { NotInfographicOwner } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface UpdateInfographicInput {
  infographicId: string;
  userId: string;
  title?: string;
  infographicType?: string;
  aspectRatio?: string;
  customInstructions?: string | null;
  feedbackInstructions?: string | null;
  styleOptions?: InfographicStyleOptions | null;
  documentIds?: string[];
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Update an infographic's settings.
 *
 * Validates that the user owns the infographic before updating.
 */
export const updateInfographic = (input: UpdateInfographicInput) =>
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

    // Build update object with only provided fields
    const updates: Parameters<typeof infographicRepo.update>[1] = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.infographicType !== undefined) updates.infographicType = input.infographicType;
    if (input.aspectRatio !== undefined) updates.aspectRatio = input.aspectRatio;
    if (input.customInstructions !== undefined) updates.customInstructions = input.customInstructions;
    if (input.feedbackInstructions !== undefined) updates.feedbackInstructions = input.feedbackInstructions;
    if (input.styleOptions !== undefined) updates.styleOptions = input.styleOptions;
    if (input.documentIds !== undefined) updates.sourceDocumentIds = input.documentIds;

    const updated = yield* infographicRepo.update(input.infographicId, updates);

    return updated;
  }).pipe(
    Effect.withSpan('useCase.updateInfographic', {
      attributes: { 'infographic.id': input.infographicId },
    }),
  );
