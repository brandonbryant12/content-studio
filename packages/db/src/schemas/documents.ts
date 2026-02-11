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
    contentKey: text('contentKey').notNull(),
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

export const DocumentSource = {
  MANUAL: 'manual',
  UPLOAD_TXT: 'upload_txt',
  UPLOAD_PDF: 'upload_pdf',
  UPLOAD_DOCX: 'upload_docx',
  UPLOAD_PPTX: 'upload_pptx',
} as const;

export const CreateDocumentSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  content: Schema.String.pipe(Schema.minLength(1)),
  metadata: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  ),
});

export const UpdateDocumentFields = {
  title: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  ),
  content: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  metadata: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  ),
};

export const UpdateDocumentSchema = Schema.Struct(UpdateDocumentFields);

export const DocumentSourceSchema = Schema.Union(
  Schema.Literal('manual'),
  Schema.Literal('upload_txt'),
  Schema.Literal('upload_pdf'),
  Schema.Literal('upload_docx'),
  Schema.Literal('upload_pptx'),
);

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

export type Document = typeof document.$inferSelect;
export type DocumentSource = Document['source'];
export type DocumentOutput = typeof DocumentOutputSchema.Type;
export type CreateDocument = typeof CreateDocumentSchema.Type;
export type UpdateDocument = typeof UpdateDocumentSchema.Type;

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

export const serializeDocumentEffect = createEffectSerializer(
  'document',
  documentTransform,
);

export const serializeDocumentsEffect = createBatchEffectSerializer(
  'document',
  documentTransform,
);

export const serializeDocument = createSyncSerializer(documentTransform);
