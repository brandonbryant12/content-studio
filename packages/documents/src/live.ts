import { CurrentUser, requireOwnership, Role } from '@repo/auth-policy';
import { Storage } from '@repo/storage';
import { Effect, Layer } from 'effect';
import type { Db } from '@repo/effect/db';
import { DocumentNotFound } from './errors';
import {
  parseUploadedFile,
  parseDocumentContent,
  validateFileSize,
  validateMimeType,
  getMimeType,
} from './parsers';
import * as Repo from './repository';
import { Documents, type DocumentService } from './service';

/**
 * Calculate word count from content.
 */
const calculateWordCount = (content: string): number =>
  content
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

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

/**
 * Create live document service implementation.
 *
 * Returns Effects that require Db, CurrentUser, and Storage contexts.
 * These requirements are satisfied when composing the final layer.
 */
const makeDocumentService: DocumentService = {
  create: (data) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const storage = yield* Storage;

      // Generate storage key for the content
      const contentKey = generateContentKey('.txt');
      const contentBuffer = Buffer.from(data.content, 'utf-8');

      // Upload content to storage
      yield* storage.upload(contentKey, contentBuffer, 'text/plain');

      // Calculate word count
      const wordCount = calculateWordCount(data.content);

      // Insert metadata to DB
      const doc = yield* Repo.insertDocument({
        title: data.title,
        contentKey,
        mimeType: 'text/plain',
        wordCount,
        source: 'manual',
        originalFileSize: contentBuffer.length,
        metadata: data.metadata,
        createdBy: user.id,
      });

      return doc;
    }).pipe(Effect.withSpan('documents.create')),

  upload: (input) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const storage = yield* Storage;

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
      const doc = yield* Repo.insertDocument({
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
      Effect.withSpan('documents.upload', {
        attributes: {
          'file.name': input.fileName,
          'file.size': input.data.length,
        },
      }),
    ),

  findById: (id) =>
    Effect.gen(function* () {
      const doc = yield* Repo.findDocumentById(id);

      // Check ownership (allows owner or admin)
      yield* requireOwnership(doc.createdBy);

      return doc;
    }).pipe(
      Effect.withSpan('documents.findById', {
        attributes: { 'document.id': id },
      }),
    ),

  getContent: (id) =>
    Effect.gen(function* () {
      const storage = yield* Storage;
      const doc = yield* Repo.findDocumentById(id);

      // Check ownership
      yield* requireOwnership(doc.createdBy);

      // Download file from storage
      const buffer = yield* storage.download(doc.contentKey);

      // For plain text, return directly
      if (doc.mimeType === 'text/plain') {
        return buffer.toString('utf-8');
      }

      // For other formats, parse on-demand (no validation - already validated on upload)
      return yield* parseDocumentContent({
        fileName: doc.originalFileName ?? 'file',
        mimeType: doc.mimeType,
        data: buffer,
      });
    }).pipe(
      Effect.withSpan('documents.getContent', {
        attributes: { 'document.id': id },
      }),
    ),

  list: (options) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;

      // Non-admins can only see their own documents
      const isAdmin = user.role === Role.ADMIN;
      const docs = yield* Repo.listDocuments({
        createdBy: isAdmin ? undefined : user.id,
        limit: options?.limit,
        offset: options?.offset,
      });

      return docs;
    }).pipe(Effect.withSpan('documents.list')),

  update: (id, data) =>
    Effect.gen(function* () {
      const storage = yield* Storage;

      // First verify document exists and user has access
      const existing = yield* Repo.findDocumentById(id);
      yield* requireOwnership(existing.createdBy);

      const updateInput: Repo.UpdateDocumentInput = {};

      if (data.title !== undefined) {
        updateInput.title = data.title;
      }

      if (data.metadata !== undefined) {
        updateInput.metadata = data.metadata;
      }

      // If content is being updated, upload new content to storage
      if (data.content !== undefined) {
        const contentBuffer = Buffer.from(data.content, 'utf-8');

        // Delete old content from storage (ignore errors - might not exist)
        yield* storage.delete(existing.contentKey).pipe(Effect.ignore);

        // Generate new content key and upload
        const newContentKey = generateContentKey('.txt');
        yield* storage.upload(newContentKey, contentBuffer, 'text/plain');

        updateInput.contentKey = newContentKey;
        updateInput.wordCount = calculateWordCount(data.content);
      }

      const doc = yield* Repo.updateDocument(id, updateInput);
      return doc;
    }).pipe(
      Effect.withSpan('documents.update', {
        attributes: { 'document.id': id },
      }),
    ),

  delete: (id) =>
    Effect.gen(function* () {
      const storage = yield* Storage;

      // Verify document exists and user has access
      const existing = yield* Repo.findDocumentById(id);
      yield* requireOwnership(existing.createdBy);

      // Delete from storage first (ignore errors - file might not exist)
      yield* storage.delete(existing.contentKey).pipe(Effect.ignore);

      // Then delete metadata from DB
      const deleted = yield* Repo.deleteDocument(id);
      if (!deleted) {
        return yield* Effect.fail(new DocumentNotFound({ id }));
      }
    }).pipe(
      Effect.withSpan('documents.delete', {
        attributes: { 'document.id': id },
      }),
    ),

  count: () =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;

      // Non-admins only count their own documents
      const isAdmin = user.role === Role.ADMIN;
      return yield* Repo.countDocuments({
        createdBy: isAdmin ? undefined : user.id,
      });
    }).pipe(Effect.withSpan('documents.count')),
};

/**
 * Live layer for document service.
 *
 * Requires:
 * - Db: Database connection
 * - CurrentUser: Authenticated user context
 * - Storage: File storage backend (S3, filesystem, etc.)
 *
 * @example
 * ```typescript
 * // Compose with other layers - choose storage backend
 * const StorageLive = process.env.STORAGE_PROVIDER === 's3'
 *   ? S3StorageLive({ bucket: 'my-bucket', region: 'us-east-1' })
 *   : FilesystemStorageLive({ basePath: './uploads' });
 *
 * const AppLive = DocumentsLive.pipe(
 *   Layer.provide(DbLive(database)),
 *   Layer.provide(CurrentUserLive(user)),
 *   Layer.provide(StorageLive),
 * );
 * ```
 */
export const DocumentsLive: Layer.Layer<
  Documents,
  never,
  Db | CurrentUser | Storage
> = Layer.succeed(Documents, makeDocumentService);
