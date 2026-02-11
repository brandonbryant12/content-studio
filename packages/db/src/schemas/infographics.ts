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
  createEffectSerializer,
  createBatchEffectSerializer,
  createSyncSerializer,
} from './serialization';
import {
  type InfographicId,
  type InfographicVersionId,
  InfographicIdSchema,
  InfographicVersionIdSchema,
  generateInfographicId,
  generateInfographicVersionId,
} from './brands';

// =============================================================================
// Enums
// =============================================================================

export const infographicTypeEnum = pgEnum('infographic_type', [
  'timeline',
  'comparison',
  'stats_dashboard',
  'key_takeaways',
]);

export const infographicStyleEnum = pgEnum('infographic_style', [
  'modern_minimal',
  'bold_colorful',
  'corporate',
  'playful',
  'dark_mode',
  'editorial',
]);

export const infographicFormatEnum = pgEnum('infographic_format', [
  'portrait',
  'square',
  'landscape',
  'og_card',
]);

export const infographicStatusEnum = pgEnum('infographic_status', [
  'draft',
  'generating',
  'ready',
  'failed',
]);

export const InfographicStatus = {
  DRAFT: 'draft',
  GENERATING: 'generating',
  READY: 'ready',
  FAILED: 'failed',
} as const;

// =============================================================================
// Infographic Table
// =============================================================================

export const infographic = pgTable(
  'infographic',
  {
    id: varchar('id', { length: 20 })
      .$type<InfographicId>()
      .$default(generateInfographicId)
      .primaryKey(),
    title: text('title').notNull(),
    prompt: text('prompt'),
    infographicType: infographicTypeEnum('infographic_type').notNull(),
    stylePreset: infographicStyleEnum('style_preset').notNull(),
    format: infographicFormatEnum('format').notNull(),
    sourceDocumentIds: jsonb('source_document_ids')
      .$type<string[]>()
      .default([]),
    imageStorageKey: text('image_storage_key'),
    thumbnailStorageKey: text('thumbnail_storage_key'),
    status: infographicStatusEnum('status').notNull().default('draft'),
    errorMessage: text('error_message'),
    approvedBy: text('approved_by').references(() => user.id),
    approvedAt: timestamp('approved_at', { mode: 'date', withTimezone: true }),

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
    index('infographic_createdBy_idx').on(table.createdBy),
    index('infographic_status_idx').on(table.status),
  ],
);

// =============================================================================
// Infographic Version Table
// =============================================================================

export const infographicVersion = pgTable(
  'infographic_version',
  {
    id: varchar('id', { length: 20 })
      .$type<InfographicVersionId>()
      .$default(generateInfographicVersionId)
      .primaryKey(),
    infographicId: varchar('infographic_id', { length: 20 })
      .notNull()
      .references(() => infographic.id, { onDelete: 'cascade' })
      .$type<InfographicId>(),
    versionNumber: integer('version_number').notNull(),
    prompt: text('prompt'),
    infographicType: infographicTypeEnum('infographic_type_v').notNull(),
    stylePreset: infographicStyleEnum('style_preset_v').notNull(),
    format: infographicFormatEnum('format_v').notNull(),
    imageStorageKey: text('image_storage_key').notNull(),
    thumbnailStorageKey: text('thumbnail_storage_key'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('infographic_version_infographicId_idx').on(table.infographicId),
  ],
);

// =============================================================================
// Input Schemas
// =============================================================================

export const InfographicTypeSchema = Schema.Union(
  Schema.Literal('timeline'),
  Schema.Literal('comparison'),
  Schema.Literal('stats_dashboard'),
  Schema.Literal('key_takeaways'),
);

export const InfographicStyleSchema = Schema.Union(
  Schema.Literal('modern_minimal'),
  Schema.Literal('bold_colorful'),
  Schema.Literal('corporate'),
  Schema.Literal('playful'),
  Schema.Literal('dark_mode'),
  Schema.Literal('editorial'),
);

export const InfographicFormatSchema = Schema.Union(
  Schema.Literal('portrait'),
  Schema.Literal('square'),
  Schema.Literal('landscape'),
  Schema.Literal('og_card'),
);

export const InfographicStatusSchema = Schema.Union(
  Schema.Literal('draft'),
  Schema.Literal('generating'),
  Schema.Literal('ready'),
  Schema.Literal('failed'),
);

export const CreateInfographicSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  infographicType: InfographicTypeSchema,
  stylePreset: InfographicStyleSchema,
  format: InfographicFormatSchema,
  prompt: Schema.optional(Schema.String),
  sourceDocumentIds: Schema.optional(Schema.Array(Schema.String)),
});

export const UpdateInfographicFields = {
  title: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  ),
  prompt: Schema.optional(Schema.String),
  infographicType: Schema.optional(InfographicTypeSchema),
  stylePreset: Schema.optional(InfographicStyleSchema),
  format: Schema.optional(InfographicFormatSchema),
  sourceDocumentIds: Schema.optional(Schema.Array(Schema.String)),
};

export const UpdateInfographicSchema = Schema.Struct(UpdateInfographicFields);

// =============================================================================
// Output Schemas
// =============================================================================

export const InfographicOutputSchema = Schema.Struct({
  id: InfographicIdSchema,
  title: Schema.String,
  prompt: Schema.NullOr(Schema.String),
  infographicType: InfographicTypeSchema,
  stylePreset: InfographicStyleSchema,
  format: InfographicFormatSchema,
  sourceDocumentIds: Schema.Array(Schema.String),
  imageStorageKey: Schema.NullOr(Schema.String),
  thumbnailStorageKey: Schema.NullOr(Schema.String),
  status: InfographicStatusSchema,
  errorMessage: Schema.NullOr(Schema.String),
  approvedBy: Schema.NullOr(Schema.String),
  approvedAt: Schema.NullOr(Schema.String),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const InfographicVersionOutputSchema = Schema.Struct({
  id: InfographicVersionIdSchema,
  infographicId: InfographicIdSchema,
  versionNumber: Schema.Number,
  prompt: Schema.NullOr(Schema.String),
  infographicType: InfographicTypeSchema,
  stylePreset: InfographicStyleSchema,
  format: InfographicFormatSchema,
  imageStorageKey: Schema.String,
  thumbnailStorageKey: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
});

// =============================================================================
// Types
// =============================================================================

export type Infographic = typeof infographic.$inferSelect;
export type InfographicType = Infographic['infographicType'];
export type InfographicStyle = Infographic['stylePreset'];
export type InfographicFormat = Infographic['format'];
export type InfographicStatusType = Infographic['status'];
export type InfographicOutput = typeof InfographicOutputSchema.Type;
export type CreateInfographic = typeof CreateInfographicSchema.Type;
export type UpdateInfographic = typeof UpdateInfographicSchema.Type;

export type InfographicVersion = typeof infographicVersion.$inferSelect;
export type InfographicVersionOutput =
  typeof InfographicVersionOutputSchema.Type;

// =============================================================================
// Transform Functions
// =============================================================================

const infographicTransform = (row: Infographic): InfographicOutput => ({
  id: row.id,
  title: row.title,
  prompt: row.prompt ?? null,
  infographicType: row.infographicType,
  stylePreset: row.stylePreset,
  format: row.format,
  sourceDocumentIds: (row.sourceDocumentIds as string[]) ?? [],
  imageStorageKey: row.imageStorageKey ?? null,
  thumbnailStorageKey: row.thumbnailStorageKey ?? null,
  status: row.status,
  errorMessage: row.errorMessage ?? null,
  approvedBy: row.approvedBy ?? null,
  approvedAt: row.approvedAt?.toISOString() ?? null,
  createdBy: row.createdBy,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const infographicVersionTransform = (
  row: InfographicVersion,
): InfographicVersionOutput => ({
  id: row.id,
  infographicId: row.infographicId,
  versionNumber: row.versionNumber,
  prompt: row.prompt ?? null,
  infographicType: row.infographicType,
  stylePreset: row.stylePreset,
  format: row.format,
  imageStorageKey: row.imageStorageKey,
  thumbnailStorageKey: row.thumbnailStorageKey ?? null,
  createdAt: row.createdAt.toISOString(),
});

// =============================================================================
// Serializers
// =============================================================================

// --- Infographic ---

export const serializeInfographicEffect = createEffectSerializer(
  'infographic',
  infographicTransform,
);

export const serializeInfographicsEffect = createBatchEffectSerializer(
  'infographic',
  infographicTransform,
);

export const serializeInfographic = createSyncSerializer(infographicTransform);

// --- InfographicVersion ---

export const serializeInfographicVersionEffect = createEffectSerializer(
  'infographicVersion',
  infographicVersionTransform,
);

export const serializeInfographicVersionsEffect = createBatchEffectSerializer(
  'infographicVersion',
  infographicVersionTransform,
);

export const serializeInfographicVersion = createSyncSerializer(
  infographicVersionTransform,
);
