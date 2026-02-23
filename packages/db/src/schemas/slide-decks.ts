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
  type DocumentId,
  type SlideDeckId,
  type SlideDeckVersionId,
  DocumentIdSchema,
  SlideDeckIdSchema,
  SlideDeckVersionIdSchema,
  generateSlideDeckId,
  generateSlideDeckVersionId,
} from './brands';
import {
  createBatchEffectSerializer,
  createEffectSerializer,
} from './serialization';

// =============================================================================
// Slide Content
// =============================================================================

export interface SlideContent {
  id: string;
  title: string;
  body?: string;
  bullets?: readonly string[];
  imageUrl?: string;
  notes?: string;
  layout?:
    | 'title'
    | 'title_bullets'
    | 'two_column'
    | 'image_left'
    | 'image_right'
    | 'quote';
  sourceDocumentIds?: readonly DocumentId[];
}

export const SlideLayoutSchema = Schema.Literal(
  'title',
  'title_bullets',
  'two_column',
  'image_left',
  'image_right',
  'quote',
);

export const SlideContentSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  body: Schema.optional(Schema.String),
  bullets: Schema.optional(Schema.Array(Schema.String)),
  imageUrl: Schema.optional(Schema.String),
  notes: Schema.optional(Schema.String),
  layout: Schema.optional(SlideLayoutSchema),
  sourceDocumentIds: Schema.optional(Schema.Array(DocumentIdSchema)),
});

export const SlideContentsSchema = Schema.Array(SlideContentSchema);

// =============================================================================
// Enums
// =============================================================================

export const slideDeckThemeEnum = pgEnum('slide_deck_theme', [
  'executive',
  'academic',
  'minimal',
  'contrast',
  'blueprint',
  'sunrise',
  'graphite',
  'editorial',
]);

export const slideDeckStatusEnum = pgEnum('slide_deck_status', [
  'draft',
  'generating',
  'ready',
  'failed',
]);

export const SlideDeckStatus = {
  DRAFT: 'draft',
  GENERATING: 'generating',
  READY: 'ready',
  FAILED: 'failed',
} as const;

// =============================================================================
// Tables
// =============================================================================

export const slideDeck = pgTable(
  'slide_deck',
  {
    id: varchar('id', { length: 20 })
      .$type<SlideDeckId>()
      .$default(generateSlideDeckId)
      .primaryKey(),
    title: text('title').notNull(),
    prompt: text('prompt'),
    sourceDocumentIds: jsonb('source_document_ids')
      .$type<DocumentId[]>()
      .notNull()
      .default([]),
    theme: slideDeckThemeEnum('theme').notNull().default('executive'),
    slides: jsonb('slides').$type<SlideContent[]>().notNull().default([]),
    generatedHtml: text('generated_html'),
    status: slideDeckStatusEnum('status').notNull().default('draft'),
    errorMessage: text('error_message'),
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
    index('slide_deck_createdBy_idx').on(table.createdBy),
    index('slide_deck_status_idx').on(table.status),
  ],
);

export const slideDeckVersion = pgTable(
  'slide_deck_version',
  {
    id: varchar('id', { length: 20 })
      .$type<SlideDeckVersionId>()
      .$default(generateSlideDeckVersionId)
      .primaryKey(),
    slideDeckId: varchar('slide_deck_id', { length: 20 })
      .notNull()
      .references(() => slideDeck.id, { onDelete: 'cascade' })
      .$type<SlideDeckId>(),
    versionNumber: integer('version_number').notNull(),
    prompt: text('prompt_v'),
    sourceDocumentIds: jsonb('source_document_ids_v')
      .$type<DocumentId[]>()
      .notNull()
      .default([]),
    theme: slideDeckThemeEnum('theme_v').notNull(),
    slides: jsonb('slides_v').$type<SlideContent[]>().notNull().default([]),
    generatedHtml: text('generated_html_v').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('slide_deck_version_slideDeckId_idx').on(table.slideDeckId),
  ],
);

// =============================================================================
// Effect Schemas
// =============================================================================

export const SlideDeckThemeSchema = Schema.Literal(
  ...slideDeckThemeEnum.enumValues,
);

export const SlideDeckStatusSchema = Schema.Literal(
  ...slideDeckStatusEnum.enumValues,
);

export const CreateSlideDeckSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  prompt: Schema.optional(Schema.String),
  sourceDocumentIds: Schema.optional(Schema.Array(DocumentIdSchema)),
  theme: Schema.optional(SlideDeckThemeSchema),
  slides: Schema.optional(SlideContentsSchema),
});

export const UpdateSlideDeckFields = {
  title: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  ),
  prompt: Schema.optional(Schema.String),
  sourceDocumentIds: Schema.optional(Schema.Array(DocumentIdSchema)),
  theme: Schema.optional(SlideDeckThemeSchema),
  slides: Schema.optional(SlideContentsSchema),
};

export const UpdateSlideDeckSchema = Schema.Struct(UpdateSlideDeckFields);

export const SlideDeckOutputSchema = Schema.Struct({
  id: SlideDeckIdSchema,
  title: Schema.String,
  prompt: Schema.NullOr(Schema.String),
  sourceDocumentIds: Schema.Array(DocumentIdSchema),
  theme: SlideDeckThemeSchema,
  slides: SlideContentsSchema,
  generatedHtml: Schema.NullOr(Schema.String),
  status: SlideDeckStatusSchema,
  errorMessage: Schema.NullOr(Schema.String),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const SlideDeckVersionOutputSchema = Schema.Struct({
  id: SlideDeckVersionIdSchema,
  slideDeckId: SlideDeckIdSchema,
  versionNumber: Schema.Number,
  prompt: Schema.NullOr(Schema.String),
  sourceDocumentIds: Schema.Array(DocumentIdSchema),
  theme: SlideDeckThemeSchema,
  slides: SlideContentsSchema,
  generatedHtml: Schema.String,
  createdAt: Schema.String,
});

// =============================================================================
// Types
// =============================================================================

export type SlideDeck = typeof slideDeck.$inferSelect;
export type SlideDeckTheme = SlideDeck['theme'];
export type SlideDeckStatusType = SlideDeck['status'];
export type SlideDeckOutput = typeof SlideDeckOutputSchema.Type;
export type CreateSlideDeck = typeof CreateSlideDeckSchema.Type;
export type UpdateSlideDeck = typeof UpdateSlideDeckSchema.Type;

export type SlideDeckVersion = typeof slideDeckVersion.$inferSelect;
export type SlideDeckVersionOutput = typeof SlideDeckVersionOutputSchema.Type;

// =============================================================================
// Serialization
// =============================================================================

const slideDeckTransform = (row: SlideDeck): SlideDeckOutput => ({
  id: row.id,
  title: row.title,
  prompt: row.prompt ?? null,
  sourceDocumentIds: row.sourceDocumentIds ?? [],
  theme: row.theme,
  slides: row.slides ?? [],
  generatedHtml: row.generatedHtml ?? null,
  status: row.status,
  errorMessage: row.errorMessage ?? null,
  createdBy: row.createdBy,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const slideDeckVersionTransform = (
  row: SlideDeckVersion,
): SlideDeckVersionOutput => ({
  id: row.id,
  slideDeckId: row.slideDeckId,
  versionNumber: row.versionNumber,
  prompt: row.prompt ?? null,
  sourceDocumentIds: row.sourceDocumentIds ?? [],
  theme: row.theme,
  slides: row.slides ?? [],
  generatedHtml: row.generatedHtml,
  createdAt: row.createdAt.toISOString(),
});

export const serializeSlideDeckEffect = createEffectSerializer(
  'slideDeck',
  slideDeckTransform,
);

export const serializeSlideDecksEffect = createBatchEffectSerializer(
  'slideDeck',
  slideDeckTransform,
);

export const serializeSlideDeck = slideDeckTransform;

export const serializeSlideDeckVersionEffect = createEffectSerializer(
  'slideDeckVersion',
  slideDeckVersionTransform,
);

export const serializeSlideDeckVersionsEffect = createBatchEffectSerializer(
  'slideDeckVersion',
  slideDeckVersionTransform,
);

export const serializeSlideDeckVersion = slideDeckVersionTransform;
