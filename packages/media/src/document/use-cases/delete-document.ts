import { Effect } from 'effect';
import type { Db, DatabaseError } from '@repo/db/effect';
import { Storage } from '@repo/storage';
import { requireOwnership } from '@repo/auth/policy';
import {
  DocumentNotFound,
  type ForbiddenError,
  type StorageError,
  type UnauthorizedError,
} from '@repo/db/errors';
import { DocumentRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface DeleteDocumentInput {
  id: string;
}

export type DeleteDocumentError =
  | DocumentNotFound
  | DatabaseError
  | ForbiddenError
  | UnauthorizedError
  | StorageError;

// =============================================================================
// Use Case
// =============================================================================

/**
 * Delete a document and its stored content.
 *
 * This use case:
 * 1. Fetches the existing document
 * 2. Verifies ownership (owner or admin)
 * 3. Deletes the content from storage
 * 4. Deletes the document metadata from database
 *
 * @example
 * yield* deleteDocument({ id: 'doc_abc123' });
 */
export const deleteDocument = (
  input: DeleteDocumentInput,
): Effect.Effect<void, DeleteDocumentError, Db | Storage | DocumentRepo> =>
  Effect.gen(function* () {
    const storage = yield* Storage;
    const documentRepo = yield* DocumentRepo;

    // Fetch existing document and verify ownership
    const existing = yield* documentRepo.findById(input.id);
    yield* requireOwnership(existing.createdBy);

    // Delete from storage first (ignore errors - file might not exist)
    yield* storage.delete(existing.contentKey).pipe(Effect.ignore);

    // Then delete metadata from DB
    const deleted = yield* documentRepo.delete(input.id);
    if (!deleted) {
      return yield* Effect.fail(new DocumentNotFound({ id: input.id }));
    }
  }).pipe(
    Effect.withSpan('useCase.deleteDocument', {
      attributes: { 'document.id': input.id },
    }),
  );
