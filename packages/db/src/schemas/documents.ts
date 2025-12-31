import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-valibot';
import * as v from 'valibot';
import { user } from './auth';

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
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    /** Storage key/path where the original file is stored (e.g., S3 path) */
    contentKey: text('content_key').notNull(),
    /** MIME type of the stored file */
    mimeType: text('mime_type').notNull(),
    wordCount: integer('word_count').notNull().default(0),
    source: documentSourceEnum('source').notNull().default('manual'),
    originalFileName: text('original_file_name'),
    originalFileSize: integer('original_file_size'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('document_created_by_idx').on(table.createdBy),
    index('document_created_at_idx').on(table.createdAt),
  ],
);

/**
 * Schema for creating a document via API (manual text creation).
 * Content is provided directly and will be stored in storage.
 */
export const CreateDocumentSchema = v.object({
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
  content: v.pipe(v.string(), v.minLength(1)),
  metadata: v.optional(v.record(v.string(), v.unknown())),
});

/**
 * Schema for updating a document.
 * Note: content updates require re-uploading to storage.
 */
export const UpdateDocumentSchema = v.partial(
  v.object({
    title: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
    content: v.pipe(v.string(), v.minLength(1)),
    metadata: v.optional(v.record(v.string(), v.unknown())),
  }),
);

export const DocumentSchema = createSelectSchema(document);

/**
 * Document source enum values as a Valibot picklist.
 * DERIVED from documentSourceEnum - update both if adding new sources!
 */
export const DocumentSourceSchema = v.picklist([
  'manual',
  'upload_txt',
  'upload_pdf',
  'upload_docx',
  'upload_pptx',
]);

/**
 * API output schema for documents.
 * Dates are serialized as ISO strings for JSON transport.
 * Used by API contracts to ensure consistency with DB schema.
 */
export const DocumentOutputSchema = v.object({
  id: v.string(),
  title: v.string(),
  contentKey: v.string(),
  mimeType: v.string(),
  wordCount: v.number(),
  source: DocumentSourceSchema,
  originalFileName: v.nullable(v.string()),
  originalFileSize: v.nullable(v.number()),
  metadata: v.nullable(v.record(v.string(), v.unknown())),
  createdBy: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
});

// =============================================================================
// Types - all derived from schemas above
// =============================================================================

export type Document = typeof document.$inferSelect;
export type DocumentSource = Document['source'];
export type DocumentOutput = v.InferOutput<typeof DocumentOutputSchema>;
export type CreateDocument = v.InferInput<typeof CreateDocumentSchema>;
export type UpdateDocument = v.InferInput<typeof UpdateDocumentSchema>;

// =============================================================================
// Serializer - co-located with entity so changes can't be missed
// =============================================================================

/**
 * Serialize a Document to API output format.
 *
 * Co-located with entity definition so that:
 * 1. Adding a field to `document` table → TypeScript errors here
 * 2. Updating serializer → must update DocumentOutputSchema (same file)
 * 3. Contracts import DocumentOutputSchema → automatically in sync
 */
export const serializeDocument = (doc: Document): DocumentOutput => ({
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
