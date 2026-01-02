import { Effect } from 'effect';
import type { Db, DatabaseError } from '@repo/db/effect';
import type { Document } from '@repo/db/schema';
import { Storage } from '@repo/storage';
import { getCurrentUser } from '@repo/auth/policy';
import type {
  DocumentParseError,
  DocumentTooLargeError,
  StorageUploadError,
  UnauthorizedError,
  UnsupportedDocumentFormat,
} from '@repo/db/errors';
import { DocumentRepo } from '../repos';
import {
  getMimeType,
  parseUploadedFile,
  validateFileSize,
  validateMimeType,
} from '../parsers';
import { calculateWordCount } from '../../shared';

// =============================================================================
// Types
// =============================================================================

export interface UploadDocumentInput {
  /** Original file name with extension */
  fileName: string;
  /** MIME type of the file */
  mimeType: string;
  /** File content as Buffer */
  data: Buffer;
  /** Optional custom title (defaults to filename without extension) */
  title?: string;
  /** Optional metadata to store with document */
  metadata?: Record<string, unknown>;
}

export type UploadDocumentError =
  | DatabaseError
  | StorageUploadError
  | UnauthorizedError
  | DocumentTooLargeError
  | UnsupportedDocumentFormat
  | DocumentParseError;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get file extension from filename.
 */
const getExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.slice(lastDot) : '';
};

/**
 * Generate a unique storage key for a document.
 */
const generateContentKey = (extension: string = '.txt'): string =>
  `documents/${crypto.randomUUID()}${extension}`;

// =============================================================================
// Use Case
// =============================================================================

/**
 * Upload and store a document file.
 *
 * This use case:
 * 1. Validates file size (max 10MB)
 * 2. Validates file format (TXT, PDF, DOCX, PPTX)
 * 3. Parses file to extract content and calculate word count
 * 4. Uploads original file to storage
 * 5. Creates document metadata in database
 *
 * @example
 * const doc = yield* uploadDocument({
 *   fileName: 'report.pdf',
 *   mimeType: 'application/pdf',
 *   data: fileBuffer,
 *   title: 'Q4 Report',
 * });
 */
export const uploadDocument = (
  input: UploadDocumentInput,
): Effect.Effect<Document, UploadDocumentError, Db | Storage | DocumentRepo> =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const storage = yield* Storage;
    const documentRepo = yield* DocumentRepo;

    const mimeType = getMimeType(input.fileName, input.mimeType);

    // Validate file size and format
    yield* validateFileSize(input.fileName, input.data.length);
    const source = yield* validateMimeType(input.fileName, mimeType);

    // Parse file to get content for word count calculation
    const parsed = yield* parseUploadedFile({
      fileName: input.fileName,
      mimeType,
      data: input.data,
    });

    // Generate storage key with original extension
    const ext = getExtension(input.fileName);
    const contentKey = generateContentKey(ext);

    // Store original file in storage
    yield* storage.upload(contentKey, input.data, mimeType);

    // Calculate word count from parsed content
    const wordCount = calculateWordCount(parsed.content);

    // Insert metadata to DB
    const doc = yield* documentRepo.insert({
      title: input.title ?? parsed.title,
      contentKey,
      mimeType,
      wordCount,
      source,
      originalFileName: input.fileName,
      originalFileSize: input.data.length,
      metadata: { ...parsed.metadata, ...input.metadata },
      createdBy: user.id,
    });

    return doc;
  }).pipe(
    Effect.withSpan('useCase.uploadDocument', {
      attributes: {
        'file.name': input.fileName,
        'file.size': input.data.length,
      },
    }),
  );
