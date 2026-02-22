import { type Db, type DatabaseError } from '@repo/db/effect';
import {
  type Document,
  type DocumentSource,
  type DocumentStatus,
  type JsonValue,
  type ResearchConfig,
} from '@repo/db/schema';
import { Context, Layer } from 'effect';
import type { DocumentNotFound } from '../../errors';
import type { Effect } from 'effect';
import { documentReadMethods } from './document-repo.reads';
import { documentWriteMethods } from './document-repo.writes';

// =============================================================================
// Input Types
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
  metadata?: Record<string, JsonValue>;
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
  metadata?: Record<string, JsonValue>;
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
  metadata?: Record<string, JsonValue>;
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
   * Find document by ID scoped to owner.
   * Fails with DocumentNotFound for missing or not-owned records.
   */
  readonly findByIdForUser: (
    id: string,
    userId: string,
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

  /**
   * Find research documents that were mid-operation when the worker died.
   * Returns docs with source='research', an operationId, and researchStatus='in_progress'.
   */
  readonly findOrphanedResearch: () => Effect.Effect<
    Document[],
    DatabaseError,
    Db
  >;
}

// =============================================================================
// Context Tag
// =============================================================================

export class DocumentRepo extends Context.Tag('@repo/media/DocumentRepo')<
  DocumentRepo,
  DocumentRepoService
>() {}

const make: DocumentRepoService = {
  ...documentReadMethods,
  ...documentWriteMethods,
};

// =============================================================================
// Layer
// =============================================================================

export const DocumentRepoLive: Layer.Layer<DocumentRepo> = Layer.succeed(
  DocumentRepo,
  make,
);
