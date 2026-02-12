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
} from './serialization';

export const documentSourceEnum = pgEnum('document_source', [
  'manual',
  'upload_txt',
  'upload_pdf',
  'upload_docx',
  'upload_pptx',
  'url',
  'research',
]);

export const documentStatusEnum = pgEnum('document_status', [
  'ready',
  'processing',
  'failed',
]);

export interface ResearchSource {
  title: string;
  url: string;
}

export interface ResearchConfig {
  query: string;
  operationId?: string;
  researchStatus?: string;
  sourceCount?: number;
  sources?: ResearchSource[];
}

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
    status: documentStatusEnum('status').notNull().default('ready'),
    errorMessage: text('errorMessage'),
    sourceUrl: text('sourceUrl'),
    researchConfig: jsonb('researchConfig').$type<ResearchConfig>(),
    jobId: varchar('jobId', { length: 20 }),
    extractedText: text('extractedText'),
    contentHash: text('contentHash'),
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
    index('document_status_idx').on(table.status),
    index('document_sourceUrl_idx').on(table.sourceUrl),
  ],
);

export const DocumentSource = {
  MANUAL: 'manual',
  UPLOAD_TXT: 'upload_txt',
  UPLOAD_PDF: 'upload_pdf',
  UPLOAD_DOCX: 'upload_docx',
  UPLOAD_PPTX: 'upload_pptx',
  URL: 'url',
  RESEARCH: 'research',
} as const;

export const DocumentStatus = {
  READY: 'ready',
  PROCESSING: 'processing',
  FAILED: 'failed',
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

export const DocumentSourceSchema = Schema.Literal(
  ...documentSourceEnum.enumValues,
);

export const DocumentStatusSchema = Schema.Literal(
  ...documentStatusEnum.enumValues,
);

export const ResearchSourceSchema = Schema.Struct({
  title: Schema.String,
  url: Schema.String,
});

export const ResearchConfigSchema = Schema.Struct({
  query: Schema.String,
  operationId: Schema.optional(Schema.String),
  researchStatus: Schema.optional(Schema.String),
  sourceCount: Schema.optional(Schema.Number),
  sources: Schema.optional(Schema.Array(ResearchSourceSchema)),
});

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
  status: DocumentStatusSchema,
  errorMessage: Schema.NullOr(Schema.String),
  sourceUrl: Schema.NullOr(Schema.String),
  researchConfig: Schema.NullOr(ResearchConfigSchema),
  jobId: Schema.NullOr(Schema.String),
  extractedText: Schema.NullOr(Schema.String),
  contentHash: Schema.NullOr(Schema.String),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export type Document = typeof document.$inferSelect;
export type DocumentSource = Document['source'];
export type DocumentStatus = Document['status'];
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
  status: doc.status,
  errorMessage: doc.errorMessage,
  sourceUrl: doc.sourceUrl,
  researchConfig: doc.researchConfig,
  jobId: doc.jobId,
  extractedText: doc.extractedText,
  contentHash: doc.contentHash,
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

export const serializeDocument = documentTransform;
