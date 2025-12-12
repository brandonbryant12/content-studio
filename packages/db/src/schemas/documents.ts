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
import { createInsertSchema, createSelectSchema } from 'drizzle-valibot';
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

export type Document = typeof document.$inferSelect;
export type DocumentSource = Document['source'];
export type CreateDocument = v.InferInput<typeof CreateDocumentSchema>;
export type UpdateDocument = v.InferInput<typeof UpdateDocumentSchema>;
