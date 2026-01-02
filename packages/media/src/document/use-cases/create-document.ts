import { Effect } from 'effect';
import type { Db } from '@repo/db/effect';
import type { CreateDocument, Document } from '@repo/db/schema';
import { Storage } from '@repo/storage';
import { getCurrentUser } from '@repo/auth/policy';
import { DocumentRepo } from '../repos';
import { calculateWordCount } from '../../shared';

// =============================================================================
// Types
// =============================================================================

export interface CreateDocumentInput extends CreateDocument {
  userId?: string;
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
 * Create a new document with text content.
 *
 * This use case:
 * 1. Gets the current user from context (or uses provided userId)
 * 2. Uploads the content to storage
 * 3. Calculates word count
 * 4. Creates the document metadata in the database
 *
 * @example
 * const doc = yield* createDocument({
 *   title: 'My Document',
 *   content: 'Document content here...',
 *   metadata: { source: 'api' },
 * });
 */
export const createDocument = (input: CreateDocumentInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const storage = yield* Storage;
    const documentRepo = yield* DocumentRepo;

    const { userId, ...data } = input;
    const ownerId = userId ?? user.id;

    // Generate storage key for the content
    const contentKey = generateContentKey('.txt');
    const contentBuffer = Buffer.from(data.content, 'utf-8');

    // Upload content to storage
    yield* storage.upload(contentKey, contentBuffer, 'text/plain');

    // Calculate word count
    const wordCount = calculateWordCount(data.content);

    // Insert metadata to DB
    const doc = yield* documentRepo.insert({
      title: data.title,
      contentKey,
      mimeType: 'text/plain',
      wordCount,
      source: 'manual',
      originalFileSize: contentBuffer.length,
      metadata: data.metadata,
      createdBy: ownerId,
    });

    return doc;
  }).pipe(
    Effect.withSpan('useCase.createDocument', {
      attributes: { 'document.title': input.title },
    }),
  );
