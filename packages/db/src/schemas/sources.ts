import { getTableColumns, sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { Schema } from 'effect';
import { user } from './auth';
import { type SourceId, SourceIdSchema, generateSourceId } from './brands';
import { MetadataSchema, type JsonValue } from './json';
import {
  createEffectSerializer,
  createBatchEffectSerializer,
} from './serialization';

export const sourceOriginEnum = pgEnum('source_origin', [
  'manual',
  'upload_txt',
  'upload_pdf',
  'upload_docx',
  'upload_pptx',
  'url',
  'research',
]);

export const sourceStatusEnum = pgEnum('source_status', [
  'ready',
  'processing',
  'failed',
]);

export interface ResearchSource {
  title: string;
  url: string;
}

export interface SourceOutlineSection {
  heading: string;
  summary: string;
  citations: readonly string[];
}

export interface SourceOutline {
  title: string;
  sections: readonly SourceOutlineSection[];
}

export interface ResearchConfig {
  query: string;
  operationId?: string;
  researchStatus?: string;
  sourceCount?: number;
  sources?: ResearchSource[];
  outline?: SourceOutline;
  autoGeneratePodcast?: boolean;
}

export const source = pgTable(
  'source',
  {
    id: varchar('id', { length: 20 })
      .$type<SourceId>()
      .$default(generateSourceId)
      .primaryKey(),
    title: text('title').notNull(),
    contentKey: text('contentKey').notNull(),
    mimeType: text('mimeType').notNull(),
    wordCount: integer('wordCount').notNull().default(0),
    source: sourceOriginEnum('source').notNull().default('manual'),
    originalFileName: text('originalFileName'),
    originalFileSize: integer('originalFileSize'),
    metadata: jsonb('metadata').$type<Record<string, JsonValue>>(),
    status: sourceStatusEnum('status').notNull().default('ready'),
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
    index('source_createdBy_idx').on(table.createdBy),
    index('source_createdAt_idx').on(table.createdAt),
    index('source_status_idx').on(table.status),
    index('source_sourceUrl_idx').on(table.sourceUrl),
    index('source_origin_idx').on(table.source),
    uniqueIndex('source_processing_url_per_user_unique')
      .on(table.createdBy, table.sourceUrl)
      .where(
        sql`${table.source} = 'url' AND ${table.status} = 'processing' AND ${table.sourceUrl} IS NOT NULL`,
      ),
  ],
);

export const SourceOrigin = {
  MANUAL: 'manual',
  UPLOAD_TXT: 'upload_txt',
  UPLOAD_PDF: 'upload_pdf',
  UPLOAD_DOCX: 'upload_docx',
  UPLOAD_PPTX: 'upload_pptx',
  URL: 'url',
  RESEARCH: 'research',
} as const;

export const SourceStatus = {
  READY: 'ready',
  PROCESSING: 'processing',
  FAILED: 'failed',
} as const;

export const CreateSourceSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  content: Schema.String.pipe(Schema.minLength(1)),
  metadata: Schema.optional(MetadataSchema),
});

export const UpdateSourceFields = {
  title: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  ),
  content: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  metadata: Schema.optional(MetadataSchema),
};

export const UpdateSourceSchema = Schema.Struct(UpdateSourceFields);

export const SourceOriginSchema = Schema.Literal(
  ...sourceOriginEnum.enumValues,
);

export const SourceStatusSchema = Schema.Literal(
  ...sourceStatusEnum.enumValues,
);

export const ResearchSourceSchema = Schema.Struct({
  title: Schema.String,
  url: Schema.String,
});

export const SourceOutlineSectionSchema = Schema.Struct({
  heading: Schema.String,
  summary: Schema.String,
  citations: Schema.Array(Schema.String),
});

export const SourceOutlineSchema = Schema.Struct({
  title: Schema.String,
  sections: Schema.Array(SourceOutlineSectionSchema),
});

export const ResearchConfigSchema = Schema.Struct({
  query: Schema.String,
  operationId: Schema.optional(Schema.String),
  researchStatus: Schema.optional(Schema.String),
  sourceCount: Schema.optional(Schema.Number),
  sources: Schema.optional(Schema.Array(ResearchSourceSchema)),
  outline: Schema.optional(SourceOutlineSchema),
  autoGeneratePodcast: Schema.optional(Schema.Boolean),
});

export const SourceOutputSchema = Schema.Struct({
  id: SourceIdSchema,
  title: Schema.String,
  contentKey: Schema.String,
  mimeType: Schema.String,
  wordCount: Schema.Number,
  source: SourceOriginSchema,
  originalFileName: Schema.NullOr(Schema.String),
  originalFileSize: Schema.NullOr(Schema.Number),
  metadata: Schema.NullOr(MetadataSchema),
  status: SourceStatusSchema,
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

export type Source = typeof source.$inferSelect;
export type SourceOrigin = Source['source'];
export type SourceStatus = Source['status'];
export type SourceOutput = typeof SourceOutputSchema.Type;
export type CreateSource = typeof CreateSourceSchema.Type;
export type UpdateSource = typeof UpdateSourceSchema.Type;

const sourceTransform = (doc: Source): SourceOutput => ({
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

export const serializeSourceEffect = createEffectSerializer(
  'source',
  sourceTransform,
);

export const serializeSourcesEffect = createBatchEffectSerializer(
  'source',
  sourceTransform,
);

export const serializeSource = sourceTransform;

/**
 * Columns for list queries — omits heavy text fields not needed in list views.
 */
const { extractedText: _extractedText, ...sourceListColumns } =
  getTableColumns(source);

export { sourceListColumns };

/**
 * Lean list-item type returned by the repo `list` method.
 */
export type SourceListItem = Omit<Source, 'extractedText'>;

export const SourceListItemOutputSchema = Schema.Struct({
  id: SourceIdSchema,
  title: Schema.String,
  contentKey: Schema.String,
  mimeType: Schema.String,
  wordCount: Schema.Number,
  source: SourceOriginSchema,
  originalFileName: Schema.NullOr(Schema.String),
  originalFileSize: Schema.NullOr(Schema.Number),
  metadata: Schema.NullOr(MetadataSchema),
  status: SourceStatusSchema,
  errorMessage: Schema.NullOr(Schema.String),
  sourceUrl: Schema.NullOr(Schema.String),
  researchConfig: Schema.NullOr(ResearchConfigSchema),
  jobId: Schema.NullOr(Schema.String),
  contentHash: Schema.NullOr(Schema.String),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export type SourceListItemOutput = typeof SourceListItemOutputSchema.Type;

const sourceListItemTransform = (
  doc: SourceListItem,
): SourceListItemOutput => ({
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
  contentHash: doc.contentHash,
  createdBy: doc.createdBy,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

export const serializeSourceListItemEffect = createEffectSerializer(
  'sourceListItem',
  sourceListItemTransform,
);

export const serializeSourceListItemsEffect = createBatchEffectSerializer(
  'sourceListItem',
  sourceListItemTransform,
);

export const serializeSourceListItem = sourceListItemTransform;
