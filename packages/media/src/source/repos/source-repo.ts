import { type Db, type DatabaseError } from '@repo/db/effect';
import {
  type Source,
  type SourceListItem,
  type SourceOrigin,
  type SourceStatus,
  type JsonValue,
  type ResearchConfig,
} from '@repo/db/schema';
import { Context, Layer } from 'effect';
import type { SourceNotFound } from '../../errors';
import type { Effect } from 'effect';
import { sourceReadMethods } from './source-repo.reads';
import { sourceWriteMethods } from './source-repo.writes';

// =============================================================================
// Input Types
// =============================================================================

/**
 * Input for inserting a document with content stored in external storage.
 */
export interface InsertSourceInput {
  title: string;
  /** Storage key/path where content is stored (e.g., S3 path) */
  contentKey: string;
  /** MIME type of the stored content */
  mimeType: string;
  /** Pre-calculated word count */
  wordCount: number;
  source: SourceOrigin;
  originalFileName?: string;
  originalFileSize?: number;
  metadata?: Record<string, JsonValue>;
  createdBy: string;
  status?: SourceStatus;
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
export interface UpdateSourceInput {
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
export interface SourceRepoService {
  /**
   * Insert a new document (metadata only - content already in storage).
   */
  readonly insert: (
    data: InsertSourceInput,
  ) => Effect.Effect<Source, DatabaseError, Db>;

  /**
   * Find document by ID.
   * Fails with SourceNotFound if not found.
   */
  readonly findById: (
    id: string,
  ) => Effect.Effect<Source, SourceNotFound | DatabaseError, Db>;

  /**
   * Find document by ID scoped to owner.
   * Fails with SourceNotFound for missing or not-owned records.
   */
  readonly findByIdForUser: (
    id: string,
    userId: string,
  ) => Effect.Effect<Source, SourceNotFound | DatabaseError, Db>;

  /**
   * List documents with optional filters.
   * Returns lean list items without heavy text fields.
   */
  readonly list: (
    options: ListOptions,
  ) => Effect.Effect<readonly SourceListItem[], DatabaseError, Db>;

  /**
   * Update document by ID (metadata only).
   * Fails with SourceNotFound if not found.
   */
  readonly update: (
    id: string,
    data: UpdateSourceInput,
  ) => Effect.Effect<Source, SourceNotFound | DatabaseError, Db>;

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
    status: SourceStatus,
    errorMessage?: string,
  ) => Effect.Effect<Source, SourceNotFound | DatabaseError, Db>;

  /**
   * Update content-related fields after async processing completes.
   */
  readonly updateContent: (
    id: string,
    data: UpdateContentInput,
  ) => Effect.Effect<Source, SourceNotFound | DatabaseError, Db>;

  /**
   * Find document by source URL for dedup.
   * Returns null if not found.
   */
  readonly findBySourceUrl: (
    url: string,
    createdBy: string,
  ) => Effect.Effect<Source | null, DatabaseError, Db>;

  /**
   * Update research config metadata.
   */
  readonly updateResearchConfig: (
    id: string,
    config: ResearchConfig,
  ) => Effect.Effect<Source, SourceNotFound | DatabaseError, Db>;

  /**
   * Find research documents that were mid-operation when the worker died.
   * Returns docs with source='research', an operationId, and researchStatus='in_progress'.
   */
  readonly findOrphanedResearch: () => Effect.Effect<
    Source[],
    DatabaseError,
    Db
  >;
}

// =============================================================================
// Context Tag
// =============================================================================

export class SourceRepo extends Context.Tag('@repo/media/SourceRepo')<
  SourceRepo,
  SourceRepoService
>() {}

const make: SourceRepoService = {
  ...sourceReadMethods,
  ...sourceWriteMethods,
};

// =============================================================================
// Layer
// =============================================================================

export const SourceRepoLive: Layer.Layer<SourceRepo> = Layer.succeed(
  SourceRepo,
  make,
);
