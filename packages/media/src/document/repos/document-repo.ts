import { Context, Effect, Layer } from 'effect';
import { document, type Document, type DocumentId } from '@repo/db/schema';
import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import { DocumentNotFound } from '../../errors';
import { eq, desc, count as drizzleCount } from 'drizzle-orm';
import type { InsertDocumentInput, UpdateDocumentInput } from '../repository';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for listing documents.
 */
export interface ListOptions {
  createdBy?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Repository interface for document operations.
 * Handles raw database access without business logic.
 * All methods require Db context.
 */
export interface DocumentRepoService {
  /**
   * Insert a new document (metadata only - content already in storage).
   */
  readonly insert: (
    data: InsertDocumentInput,
  ) => Effect.Effect<Document, DatabaseError, Db>;

  /**
   * Find document by ID.
   * Fails with DocumentNotFound if not found.
   */
  readonly findById: (
    id: string,
  ) => Effect.Effect<Document, DocumentNotFound | DatabaseError, Db>;

  /**
   * List documents with optional filters.
   */
  readonly list: (
    options: ListOptions,
  ) => Effect.Effect<readonly Document[], DatabaseError, Db>;

  /**
   * Update document by ID (metadata only).
   * Fails with DocumentNotFound if not found.
   */
  readonly update: (
    id: string,
    data: UpdateDocumentInput,
  ) => Effect.Effect<Document, DocumentNotFound | DatabaseError, Db>;

  /**
   * Delete document by ID.
   * Returns true if deleted, false if not found.
   */
  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;

  /**
   * Count documents with optional filter.
   */
  readonly count: (options?: {
    createdBy?: string;
  }) => Effect.Effect<number, DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class DocumentRepo extends Context.Tag('@repo/media/DocumentRepo')<
  DocumentRepo,
  DocumentRepoService
>() {}

// =============================================================================
// Implementation
// =============================================================================

const make: DocumentRepoService = {
  insert: (data) =>
    withDb('documentRepo.insert', async (db) => {
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
    }),

  findById: (id) =>
    withDb('documentRepo.findById', (db) =>
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
    ),

  list: (options) =>
    withDb('documentRepo.list', (db) => {
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
    }),

  update: (id, data) =>
    withDb('documentRepo.update', async (db) => {
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
    ),

  delete: (id) =>
    withDb('documentRepo.delete', async (db) => {
      const result = await db
        .delete(document)
        .where(eq(document.id, id as DocumentId))
        .returning({ id: document.id });
      return result.length > 0;
    }),

  count: (options) =>
    withDb('documentRepo.count', async (db) => {
      const conditions = options?.createdBy
        ? eq(document.createdBy, options.createdBy)
        : undefined;
      const [result] = await db
        .select({ count: drizzleCount() })
        .from(document)
        .where(conditions);
      return result?.count ?? 0;
    }),
};

// =============================================================================
// Layer
// =============================================================================

export const DocumentRepoLive: Layer.Layer<DocumentRepo, never, Db> =
  Layer.succeed(DocumentRepo, make);
