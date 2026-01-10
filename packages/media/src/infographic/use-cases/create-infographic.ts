import { Effect } from 'effect';
import type { Infographic, InfographicId } from '@repo/db/schema';
import { InfographicRepo } from '../repos';
import { DocumentRepo } from '../../document';
import { DocumentNotFound } from '../../errors';
import type { InfographicType } from '../prompts';

// =============================================================================
// Types
// =============================================================================

export interface CreateInfographicInput {
  title: string;
  infographicType: InfographicType;
  aspectRatio?: string;
  documentIds: string[];
  userId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Create a new infographic in drafting status.
 *
 * This use case:
 * 1. Validates all documents exist and are owned by user
 * 2. Creates the infographic record (starts in drafting status)
 * 3. Returns the created infographic
 */
export const createInfographic = (input: CreateInfographicInput) =>
  Effect.gen(function* () {
    const infographicRepo = yield* InfographicRepo;
    const documentRepo = yield* DocumentRepo;

    // Validate all documents exist and are owned by user
    for (const docId of input.documentIds) {
      const doc = yield* documentRepo.findById(docId);
      if (doc.createdBy !== input.userId) {
        return yield* Effect.fail(new DocumentNotFound({ id: docId }));
      }
    }

    // Create infographic (starts in drafting status by default)
    const infographic = yield* infographicRepo.insert({
      title: input.title,
      infographicType: input.infographicType,
      aspectRatio: input.aspectRatio ?? '1:1',
      sourceDocumentIds: input.documentIds,
      createdBy: input.userId,
    });

    return infographic;
  }).pipe(
    Effect.withSpan('useCase.createInfographic', {
      attributes: {
        'user.id': input.userId,
        'infographic.type': input.infographicType,
        'document.count': input.documentIds.length,
      },
    }),
  );
