import { Effect } from 'effect';
import type { Db } from '@repo/db/effect';
import type { Document } from '@repo/db/schema';
import { requireOwnership } from '@repo/auth/policy';
import { DocumentRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface GetDocumentInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Get a document by ID.
 *
 * Verifies that the current user owns the document (or is admin).
 * Returns document metadata only - use getDocumentContent for content.
 *
 * @example
 * const doc = yield* getDocument({ id: 'doc_abc123' });
 */
export const getDocument = (input: GetDocumentInput) =>
  Effect.gen(function* () {
    const documentRepo = yield* DocumentRepo;

    // Fetch document from database
    const doc = yield* documentRepo.findById(input.id);

    // Check ownership (allows owner or admin)
    yield* requireOwnership(doc.createdBy);

    return doc;
  }).pipe(
    Effect.withSpan('useCase.getDocument', {
      attributes: { 'document.id': input.id },
    }),
  );
