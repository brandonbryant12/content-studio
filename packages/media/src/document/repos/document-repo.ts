import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import {
  document,
  type Document,
  type DocumentId,
  type DocumentSource,
  type DocumentStatus,
  type ResearchConfig,
} from '@repo/db/schema';
import { eq, desc, and, count as drizzleCount } from 'drizzle-orm';
import { Context, Effect, Layer } from 'effect';
import { DocumentNotFound } from '../../errors';

// =============================================================================
// Input Types (previously in repository.ts)
// =============================================================================

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
  status?: DocumentStatus;
  sourceUrl?: string;
  jobId?: string;
  extractedText?: string;
  contentHash?: string;
  errorMessage?: string;
  researchConfig?: ResearchConfig;
}

/**
 * Input for updating document content after async processing.
 */
export interface UpdateContentInput {
  contentKey?: string;
  extractedText?: string;
  contentHash?: string;
  wordCount?: number;
  metadata?: Record<string, unknown>;
  title?: string;
}

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

// =============================================================================
// Types
// =============================================================================

/**
 * Options for listing documents.
 */
export interface ListOptions {
  createdBy?: string;
  source?: string;
  status?: string;
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

  /**
   * Update document processing status.
   */
  readonly updateStatus: (
    id: string,
    status: DocumentStatus,
    errorMessage?: string,
  ) => Effect.Effect<Document, DocumentNotFound | DatabaseError, Db>;

  /**
   * Update content-related fields after async processing completes.
   */
  readonly updateContent: (
    id: string,
    data: UpdateContentInput,
  ) => Effect.Effect<Document, DocumentNotFound | DatabaseError, Db>;

  /**
   * Find document by source URL for dedup.
   * Returns null if not found.
   */
  readonly findBySourceUrl: (
    url: string,
    createdBy: string,
  ) => Effect.Effect<Document | null, DatabaseError, Db>;

  /**
   * Update research config metadata.
   */
  readonly updateResearchConfig: (
    id: string,
    config: ResearchConfig,
  ) => Effect.Effect<Document, DocumentNotFound | DatabaseError, Db>;
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
      const [doc] = await db.insert(document).values(data).returning();
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
      const filters = [];
      if (options.createdBy)
        filters.push(eq(document.createdBy, options.createdBy));
      if (options.source)
        filters.push(eq(document.source, options.source as DocumentSource));
      if (options.status)
        filters.push(eq(document.status, options.status as DocumentStatus));

      const conditions = filters.length > 0 ? and(...filters) : undefined;

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
        ...data,
        updatedAt: new Date(),
      };

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

  updateStatus: (id, status, errorMessage) =>
    withDb('documentRepo.updateStatus', async (db) => {
      const updates: Partial<typeof document.$inferInsert> = {
        status,
        updatedAt: new Date(),
        // Set error message when failed, clear it otherwise
        errorMessage: status === 'failed' ? (errorMessage ?? null) : null,
      };

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

  updateContent: (id, data) =>
    withDb('documentRepo.updateContent', async (db) => {
      const updates: Partial<typeof document.$inferInsert> = {
        ...data,
        updatedAt: new Date(),
      };

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

  findBySourceUrl: (url, createdBy) =>
    withDb('documentRepo.findBySourceUrl', (db) =>
      db
        .select()
        .from(document)
        .where(
          and(eq(document.sourceUrl, url), eq(document.createdBy, createdBy)),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null),
    ),

  updateResearchConfig: (id, config) =>
    withDb('documentRepo.updateResearchConfig', async (db) => {
      const [doc] = await db
        .update(document)
        .set({
          researchConfig: config,
          updatedAt: new Date(),
        })
        .where(eq(document.id, id as DocumentId))
        .returning();
      return doc;
    }).pipe(
      Effect.flatMap((doc) =>
        doc ? Effect.succeed(doc) : Effect.fail(new DocumentNotFound({ id })),
      ),
    ),
};

// =============================================================================
// Layer
// =============================================================================

export const DocumentRepoLive: Layer.Layer<DocumentRepo, never, Db> =
  Layer.succeed(DocumentRepo, make);
