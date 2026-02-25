import {
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
  index,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core';
import { Schema } from 'effect';
import { user } from './auth';
import {
  type InfographicId,
  type InfographicVersionId,
  InfographicIdSchema,
  InfographicVersionIdSchema,
  generateInfographicId,
  generateInfographicVersionId,
} from './brands';
import {
  createEffectSerializer,
  createBatchEffectSerializer,
} from './serialization';

// =============================================================================
// Style Properties
// =============================================================================

export interface StyleProperty {
  key: string;
  value: string;
  type?: 'text' | 'color' | 'number';
}

export interface InfographicLayoutChartDatum {
  label: string;
  value: number;
}

export interface InfographicLayoutSection {
  heading: string;
  body: string;
  chartData?: readonly InfographicLayoutChartDatum[];
}

export interface InfographicLayout {
  title: string;
  sections: readonly InfographicLayoutSection[];
}

export const StylePropertySchema = Schema.Struct({
  key: Schema.String,
  value: Schema.String,
  type: Schema.optional(Schema.Literal('text', 'color', 'number')),
});

export const StylePropertiesSchema = Schema.Array(StylePropertySchema);

export const InfographicLayoutChartDatumSchema = Schema.Struct({
  label: Schema.String,
  value: Schema.Number,
});

export const InfographicLayoutSectionSchema = Schema.Struct({
  heading: Schema.String,
  body: Schema.String,
  chartData: Schema.optional(Schema.Array(InfographicLayoutChartDatumSchema)),
});

export const InfographicLayoutSchema = Schema.Struct({
  title: Schema.String,
  sections: Schema.Array(InfographicLayoutSectionSchema),
});

export type StylePropertyType = typeof StylePropertySchema.Type;

// =============================================================================
// Enums
// =============================================================================

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
// Tables
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
    styleProperties: jsonb('style_properties')
      .$type<StyleProperty[]>()
      .notNull()
      .default([]),
    layout: jsonb('layout').$type<InfographicLayout>(),
    format: infographicFormatEnum('format').notNull(),
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
    styleProperties: jsonb('style_properties_v')
      .$type<StyleProperty[]>()
      .notNull()
      .default([]),
    layout: jsonb('layout_v').$type<InfographicLayout>(),
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
// Effect Schemas
// =============================================================================

export const InfographicFormatSchema = Schema.Literal(
  ...infographicFormatEnum.enumValues,
);

export const InfographicStatusSchema = Schema.Literal(
  ...infographicStatusEnum.enumValues,
);

export const CreateInfographicSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  format: InfographicFormatSchema,
  prompt: Schema.optional(Schema.String),
  styleProperties: Schema.optional(StylePropertiesSchema),
});

export const UpdateInfographicFields = {
  title: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  ),
  prompt: Schema.optional(Schema.String),
  format: Schema.optional(InfographicFormatSchema),
  styleProperties: Schema.optional(StylePropertiesSchema),
};

export const UpdateInfographicSchema = Schema.Struct(UpdateInfographicFields);

export const InfographicOutputSchema = Schema.Struct({
  id: InfographicIdSchema,
  title: Schema.String,
  prompt: Schema.NullOr(Schema.String),
  styleProperties: StylePropertiesSchema,
  layout: Schema.NullOr(InfographicLayoutSchema),
  format: InfographicFormatSchema,
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
  styleProperties: StylePropertiesSchema,
  layout: Schema.NullOr(InfographicLayoutSchema),
  format: InfographicFormatSchema,
  imageStorageKey: Schema.String,
  thumbnailStorageKey: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
});

// =============================================================================
// Types
// =============================================================================

export type Infographic = typeof infographic.$inferSelect;
export type InfographicFormat = Infographic['format'];
export type InfographicStatusType = Infographic['status'];
export type InfographicOutput = typeof InfographicOutputSchema.Type;
export type CreateInfographic = typeof CreateInfographicSchema.Type;
export type UpdateInfographic = typeof UpdateInfographicSchema.Type;

export type InfographicVersion = typeof infographicVersion.$inferSelect;
export type InfographicVersionOutput =
  typeof InfographicVersionOutputSchema.Type;

// =============================================================================
// Serialization
// =============================================================================

const infographicTransform = (row: Infographic): InfographicOutput => ({
  id: row.id,
  title: row.title,
  prompt: row.prompt ?? null,
  styleProperties: row.styleProperties ?? [],
  layout: row.layout ?? null,
  format: row.format,
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
  styleProperties: row.styleProperties ?? [],
  layout: row.layout ?? null,
  format: row.format,
  imageStorageKey: row.imageStorageKey,
  thumbnailStorageKey: row.thumbnailStorageKey ?? null,
  createdAt: row.createdAt.toISOString(),
});

export const serializeInfographicEffect = createEffectSerializer(
  'infographic',
  infographicTransform,
);

export const serializeInfographicsEffect = createBatchEffectSerializer(
  'infographic',
  infographicTransform,
);

export const serializeInfographic = infographicTransform;

export const serializeInfographicVersionEffect = createEffectSerializer(
  'infographicVersion',
  infographicVersionTransform,
);

export const serializeInfographicVersionsEffect = createBatchEffectSerializer(
  'infographicVersion',
  infographicVersionTransform,
);

export const serializeInfographicVersion = infographicVersionTransform;
