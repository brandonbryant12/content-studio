import {
  document,
  type DocumentSource,
  type DocumentId,
} from '@repo/db/schema';
import { withDb } from '@repo/db/effect';
import { DocumentNotFound } from '@repo/db/errors';
import { eq, desc, count as drizzleCount } from 'drizzle-orm';
import { Effect } from 'effect';

/**
 * Input for inserting a document with content stored in external storage.
 */
export interface InsertDocumentInput {
  title: string;
  /** Storage key/path where content is stored (e.g., S3 path) */
  contentKey: string;
  /** MIME type of the stored content */
  mimeType: string;
  /** Pre-calculated word count */
  wordCount: number;
  source: DocumentSource;
  originalFileName?: string;
  originalFileSize?: number;
  metadata?: Record<string, unknown>;
  createdBy: string;
}

/**
 * Insert a new document (metadata only - content already in storage).
 */
export const insertDocument = (data: InsertDocumentInput) =>
  withDb('documents.insert', async (db) => {
    const [doc] = await db
      .insert(document)
      .values({
        title: data.title,
        contentKey: data.contentKey,
        mimeType: data.mimeType,
        wordCount: data.wordCount,
        source: data.source,
        originalFileName: data.originalFileName,
        originalFileSize: data.originalFileSize,
        metadata: data.metadata,
        createdBy: data.createdBy,
      })
      .returning();
    return doc!;
  });

/**
 * Find document by ID.
 */
export const findDocumentById = (id: string) =>
  withDb('documents.findById', (db) =>
    db
      .select()
      .from(document)
      .where(eq(document.id, id as DocumentId))
      .limit(1)
      .then((rows) => rows[0]),
  ).pipe(
    Effect.flatMap((doc) =>
      doc ? Effect.succeed(doc) : Effect.fail(new DocumentNotFound({ id })),
    ),
  );

/**
 * List documents with optional filters.
 */
export const listDocuments = (options: {
  createdBy?: string;
  limit?: number;
  offset?: number;
}) =>
  withDb('documents.list', (db) => {
    const conditions = options.createdBy
      ? eq(document.createdBy, options.createdBy)
      : undefined;

    return db
      .select()
      .from(document)
      .where(conditions)
      .orderBy(desc(document.createdAt))
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0);
  });

/**
 * Input for updating document metadata.
 * Content updates are handled separately via storage.
 */
export interface UpdateDocumentInput {
  title?: string;
  /** New content key if content was re-uploaded */
  contentKey?: string;
  /** New word count if content changed */
  wordCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Update document by ID (metadata only).
 */
export const updateDocument = (id: string, data: UpdateDocumentInput) =>
  withDb('documents.update', async (db) => {
    const updates: Partial<typeof document.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updates.title = data.title;
    if (data.contentKey !== undefined) updates.contentKey = data.contentKey;
    if (data.wordCount !== undefined) updates.wordCount = data.wordCount;
    if (data.metadata !== undefined) updates.metadata = data.metadata;

    const [doc] = await db
      .update(document)
      .set(updates)
      .where(eq(document.id, id as DocumentId))
      .returning();
    return doc;
  }).pipe(
    Effect.flatMap((doc) =>
      doc ? Effect.succeed(doc) : Effect.fail(new DocumentNotFound({ id })),
    ),
  );

/**
 * Delete document by ID.
 */
export const deleteDocument = (id: string) =>
  withDb('documents.delete', async (db) => {
    const result = await db
      .delete(document)
      .where(eq(document.id, id as DocumentId))
      .returning({ id: document.id });
    return result.length > 0;
  });

/**
 * Count documents with optional filter.
 */
export const countDocuments = (options?: { createdBy?: string }) =>
  withDb('documents.count', async (db) => {
    const conditions = options?.createdBy
      ? eq(document.createdBy, options.createdBy)
      : undefined;
    const [result] = await db
      .select({ count: drizzleCount() })
      .from(document)
      .where(conditions);
    return result?.count ?? 0;
  });
