import {
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { Schema } from 'effect';
import { user } from './auth';
import {
  type DocumentId,
  DocumentIdSchema,
  generateDocumentId,
} from './brands';
import {
  createEffectSerializer,
  createBatchEffectSerializer,
  createSyncSerializer,
} from './serialization';

export const documentSourceEnum = pgEnum('document_source', [
  'manual',
  'upload_txt',
  'upload_pdf',
  'upload_docx',
  'upload_pptx',
]);

export const document = pgTable(
  'document',
  {
    id: varchar('id', { length: 20 })
      .$type<DocumentId>()
      .$default(generateDocumentId)
      .primaryKey(),
    title: text('title').notNull(),
    /** Storage key/path where the original file is stored (e.g., S3 path) */
    contentKey: text('contentKey').notNull(),
    /** MIME type of the stored file */
    mimeType: text('mimeType').notNull(),
    wordCount: integer('wordCount').notNull().default(0),
    source: documentSourceEnum('source').notNull().default('manual'),
    originalFileName: text('originalFileName'),
    originalFileSize: integer('originalFileSize'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdBy: text('createdBy')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updatedAt', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('document_createdBy_idx').on(table.createdBy),
    index('document_createdAt_idx').on(table.createdAt),
  ],
);

/**
 * Schema for creating a document via API (manual text creation).
 * Content is provided directly and will be stored in storage.
 */
export const CreateDocumentSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  content: Schema.String.pipe(Schema.minLength(1)),
  metadata: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  ),
});

/**
 * Base fields for document updates.
 * Exported separately for use in API contracts that need to spread fields.
 */
export const UpdateDocumentFields = {
  title: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  ),
  content: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  metadata: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  ),
};

/**
 * Schema for updating a document.
 * Note: content updates require re-uploading to storage.
 */
export const UpdateDocumentSchema = Schema.Struct(UpdateDocumentFields);

/**
 * Document source enum values.
 * DERIVED from documentSourceEnum - update both if adding new sources!
 */
export const DocumentSourceSchema = Schema.Union(
  Schema.Literal('manual'),
  Schema.Literal('upload_txt'),
  Schema.Literal('upload_pdf'),
  Schema.Literal('upload_docx'),
  Schema.Literal('upload_pptx'),
);

/**
 * API output schema for documents.
 * Dates are serialized as ISO strings for JSON transport.
 * Used by API contracts to ensure consistency with DB schema.
 */
export const DocumentOutputSchema = Schema.Struct({
  id: DocumentIdSchema,
  title: Schema.String,
  contentKey: Schema.String,
  mimeType: Schema.String,
  wordCount: Schema.Number,
  source: DocumentSourceSchema,
  originalFileName: Schema.NullOr(Schema.String),
  originalFileSize: Schema.NullOr(Schema.Number),
  metadata: Schema.NullOr(
    Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  ),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

// =============================================================================
// Types - all derived from schemas above
// =============================================================================

export type Document = typeof document.$inferSelect;
export type DocumentSource = Document['source'];
export type DocumentOutput = typeof DocumentOutputSchema.Type;
export type CreateDocument = typeof CreateDocumentSchema.Type;
export type UpdateDocument = typeof UpdateDocumentSchema.Type;

// =============================================================================
// Transform Function - pure DB → API output conversion
// =============================================================================

/**
 * Pure transform function that converts a Document to DocumentOutput.
 * This is the core serialization logic, used by both sync and Effect variants.
 */
const documentTransform = (doc: Document): DocumentOutput => ({
  id: doc.id,
  title: doc.title,
  contentKey: doc.contentKey,
  mimeType: doc.mimeType,
  wordCount: doc.wordCount,
  source: doc.source,
  originalFileName: doc.originalFileName,
  originalFileSize: doc.originalFileSize,
  metadata: doc.metadata,
  createdBy: doc.createdBy,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

// =============================================================================
// Serializers - Effect-based and sync variants
// =============================================================================

/**
 * Effect-based serializer with tracing support.
 * Use this in Effect.gen handlers for observability and error handling.
 *
 * @example
 * ```typescript
 * const handler = Effect.gen(function* () {
 *   const doc = yield* getDocument(id);
 *   return yield* serializeDocumentEffect(doc);
 * });
 * ```
 */
export const serializeDocumentEffect = createEffectSerializer(
  'document',
  documentTransform,
);

/**
 * Batch serializer for multiple documents.
 * Runs serialization in parallel for better performance.
 *
 * @example
 * ```typescript
 * const outputs = yield* serializeDocumentsEffect(documents);
 * ```
 */
export const serializeDocumentsEffect = createBatchEffectSerializer(
  'document',
  documentTransform,
);

/**
 * Synchronous serializer for simple cases.
 * Use when Effect overhead is not needed (e.g., in map callbacks).
 *
 * @example
 * ```typescript
 * const outputs = documents.map(serializeDocument);
 * ```
 */
export const serializeDocument = createSyncSerializer(documentTransform);
