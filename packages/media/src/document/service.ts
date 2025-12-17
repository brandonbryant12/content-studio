import { Context } from 'effect';
import type { CurrentUser } from '@repo/auth-policy';
import type { Document, CreateDocument, UpdateDocument } from '@repo/db/schema';
import type { Db } from '@repo/effect/db';
import type {
  DbError,
  DocumentNotFound,
  ForbiddenError,
  PolicyError,
  DocumentTooLargeError,
  UnsupportedDocumentFormat,
  DocumentParseError,
  StorageError,
  StorageNotFoundError,
  StorageUploadError,
} from '@repo/effect/errors';
import type { Storage } from '@repo/storage';
import type { Effect } from 'effect';

/**
 * Context requirements for document service operations.
 * These will be provided via layer composition at runtime.
 *
 * - Db: Database connection for metadata
 * - CurrentUser: Authenticated user context
 * - Storage: File storage backend (S3, filesystem, etc.)
 */
type DocumentContext = Db | CurrentUser | Storage;

/**
 * Input for uploading a document file.
 */
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

/**
 * Document service interface.
 *
 * All methods return Effects with explicit error types for strict error handling.
 * Context requirements: Db (database), CurrentUser (auth), Storage (file storage).
 *
 * Documents store original files in Storage (S3, filesystem, etc.) and metadata in DB.
 * Content is parsed on-demand via getContent().
 */
export interface DocumentService {
  /**
   * Create a new document for the current user.
   * Stores provided text content in Storage.
   */
  readonly create: (
    data: CreateDocument,
  ) => Effect.Effect<
    Document,
    DbError | PolicyError | ForbiddenError | StorageUploadError,
    DocumentContext
  >;

  /**
   * Upload and store a document file (TXT, PDF, DOCX, PPTX).
   *
   * Validates:
   * - File size (max 10MB)
   * - File format (supported types only)
   *
   * Stores original file in Storage, metadata in DB.
   * Word count is calculated during upload for quick access.
   */
  readonly upload: (
    input: UploadDocumentInput,
  ) => Effect.Effect<
    Document,
    | DbError
    | PolicyError
    | ForbiddenError
    | StorageUploadError
    | DocumentTooLargeError
    | UnsupportedDocumentFormat
    | DocumentParseError,
    DocumentContext
  >;

  /**
   * Find a document by ID (metadata only).
   * Requires read access to the document.
   * Use getContent() to fetch the actual content.
   */
  readonly findById: (
    id: string,
  ) => Effect.Effect<
    Document,
    DocumentNotFound | DbError | PolicyError | ForbiddenError,
    DocumentContext
  >;

  /**
   * Get parsed content of a document.
   * Downloads from Storage and parses on-demand.
   * Requires read access to the document.
   */
  readonly getContent: (
    id: string,
  ) => Effect.Effect<
    string,
    | DocumentNotFound
    | DbError
    | PolicyError
    | ForbiddenError
    | StorageError
    | StorageNotFoundError
    | DocumentParseError,
    DocumentContext
  >;

  /**
   * List all documents the current user can access (metadata only).
   * Supports pagination via limit/offset.
   */
  readonly list: (options?: {
    limit?: number;
    offset?: number;
  }) => Effect.Effect<
    readonly Document[],
    DbError | PolicyError,
    DocumentContext
  >;

  /**
   * Update a document metadata and optionally content.
   * Requires write access (owner or admin).
   * If content is provided, re-uploads to Storage.
   */
  readonly update: (
    id: string,
    data: UpdateDocument,
  ) => Effect.Effect<
    Document,
    | DocumentNotFound
    | DbError
    | PolicyError
    | ForbiddenError
    | StorageUploadError
    | StorageError,
    DocumentContext
  >;

  /**
   * Delete a document (both metadata and stored file).
   * Requires delete access (owner or admin).
   */
  readonly delete: (
    id: string,
  ) => Effect.Effect<
    void,
    DocumentNotFound | DbError | PolicyError | ForbiddenError | StorageError,
    DocumentContext
  >;

  /**
   * Count documents for the current user.
   */
  readonly count: () => Effect.Effect<
    number,
    DbError | PolicyError,
    DocumentContext
  >;
}

export class Documents extends Context.Tag('@repo/media/Documents')<
  Documents,
  DocumentService
>() {}
