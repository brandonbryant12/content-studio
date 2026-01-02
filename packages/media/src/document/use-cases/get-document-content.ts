import { Effect } from 'effect';
import type { Db, DatabaseError } from '@repo/db/effect';
import { Storage } from '@repo/storage';
import { requireOwnership } from '@repo/auth/policy';
import type {
  DocumentNotFound,
  DocumentParseError,
  ForbiddenError,
  StorageError,
  StorageNotFoundError,
  UnauthorizedError,
} from '@repo/db/errors';
import { DocumentRepo } from '../repos';
import { parseDocumentContent } from '../parsers';

// =============================================================================
// Types
// =============================================================================

export interface GetDocumentContentInput {
  id: string;
}

export interface GetDocumentContentResult {
  content: string;
}

export type GetDocumentContentError =
  | DocumentNotFound
  | DatabaseError
  | ForbiddenError
  | UnauthorizedError
  | StorageError
  | StorageNotFoundError
  | DocumentParseError;

// =============================================================================
// Use Case
// =============================================================================

/**
 * Get the parsed content of a document.
 *
 * This use case:
 * 1. Fetches document metadata from database
 * 2. Verifies ownership (owner or admin)
 * 3. Downloads the file from storage
 * 4. Parses content based on file type (TXT, PDF, DOCX, PPTX)
 *
 * @example
 * const { content } = yield* getDocumentContent({ id: 'doc_abc123' });
 */
export const getDocumentContent = (
  input: GetDocumentContentInput,
): Effect.Effect<GetDocumentContentResult, GetDocumentContentError, Db | Storage | DocumentRepo> =>
  Effect.gen(function* () {
    const storage = yield* Storage;
    const documentRepo = yield* DocumentRepo;

    // Fetch document metadata
    const doc = yield* documentRepo.findById(input.id);

    // Check ownership
    yield* requireOwnership(doc.createdBy);

    // Download file from storage
    const buffer = yield* storage.download(doc.contentKey);

    // For plain text, return directly
    if (doc.mimeType === 'text/plain') {
      return { content: buffer.toString('utf-8') };
    }

    // For other formats, parse on-demand
    const content = yield* parseDocumentContent({
      fileName: doc.originalFileName ?? 'file',
      mimeType: doc.mimeType,
      data: buffer,
    });

    return { content };
  }).pipe(
    Effect.withSpan('useCase.getDocumentContent', {
      attributes: { 'document.id': input.id },
    }),
  );
