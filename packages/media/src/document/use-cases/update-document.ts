import { Effect } from 'effect';
import type { Db } from '@repo/db/effect';
import type { Document } from '@repo/db/schema';
import { Storage } from '@repo/storage';
import { requireOwnership } from '@repo/auth/policy';
import { DocumentRepo } from '../repos';
import type { UpdateDocumentInput as RepoUpdateInput } from '../repository';
import { calculateWordCount } from '../../shared';

// =============================================================================
// Types
// =============================================================================

export interface UpdateDocumentInput {
  id: string;
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generate a unique storage key for a document.
 */
const generateContentKey = (extension: string = '.txt'): string =>
  `documents/${crypto.randomUUID()}${extension}`;

// =============================================================================
// Use Case
// =============================================================================

/**
 * Update a document's metadata and/or content.
 *
 * This use case:
 * 1. Fetches the existing document
 * 2. Verifies ownership (owner or admin)
 * 3. If content is updated, uploads new content to storage and deletes old
 * 4. Updates document metadata in database
 *
 * @example
 * const doc = yield* updateDocument({
 *   id: 'doc_abc123',
 *   title: 'Updated Title',
 *   content: 'New content...',
 * });
 */
export const updateDocument = (input: UpdateDocumentInput) =>
  Effect.gen(function* () {
    const storage = yield* Storage;
    const documentRepo = yield* DocumentRepo;

    // Fetch existing document and verify ownership
    const existing = yield* documentRepo.findById(input.id);
    yield* requireOwnership(existing.createdBy);

    const updateInput: RepoUpdateInput = {};

    if (input.title !== undefined) {
      updateInput.title = input.title;
    }

    if (input.metadata !== undefined) {
      updateInput.metadata = input.metadata;
    }

    // If content is being updated, upload new content to storage
    if (input.content !== undefined) {
      const contentBuffer = Buffer.from(input.content, 'utf-8');

      // Delete old content from storage (ignore errors - might not exist)
      yield* storage.delete(existing.contentKey).pipe(Effect.ignore);

      // Generate new content key and upload
      const newContentKey = generateContentKey('.txt');
      yield* storage.upload(newContentKey, contentBuffer, 'text/plain');

      updateInput.contentKey = newContentKey;
      updateInput.wordCount = calculateWordCount(input.content);
    }

    const doc = yield* documentRepo.update(input.id, updateInput);
    return doc;
  }).pipe(
    Effect.withSpan('useCase.updateDocument', {
      attributes: { 'document.id': input.id },
    }),
  );
