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
import { document } from './documents';
import {
  createEffectSerializer,
  createBatchEffectSerializer,
  createSyncSerializer,
} from './serialization';
import {
  type InfographicId,
  type InfographicSelectionId,
  type DocumentId,
  InfographicIdSchema,
  InfographicSelectionIdSchema,
  DocumentIdSchema,
  generateInfographicId,
  generateInfographicSelectionId,
} from './brands';

// =============================================================================
// Infographic Status Enum
// =============================================================================

/**
 * Infographic status enum.
 * Tracks the infographic's generation state.
 *
 * Flow: drafting → generating → ready
 */
export const infographicStatusEnum = pgEnum('infographic_status', [
  'drafting', // Initial state, selecting content
  'generating', // Image generation in progress
  'ready', // Generation complete
  'failed', // Generation failed
]);

/**
 * Infographic status values for runtime usage.
 * Use this instead of magic strings for type-safe status comparisons.
 *
 * @example
 * import { InfographicStatus } from '@repo/db/schema';
 * if (infographic.status === InfographicStatus.READY) { ... }
 */
export const InfographicStatus = {
  DRAFTING: 'drafting',
  GENERATING: 'generating',
  READY: 'ready',
  FAILED: 'failed',
} as const;

// =============================================================================
// Type Definitions for JSONB Fields
// =============================================================================

/**
 * Style options for infographic generation.
 */
export interface InfographicStyleOptions {
  colorScheme?: string;
  emphasis?: string[];
  layout?: string;
}

/**
 * Context captured when an infographic is generated.
 * Used for debugging and regeneration.
 */
export interface InfographicGenerationContext {
  promptUsed: string;
  selectionsAtGeneration: Array<{
    id: string;
    text: string;
    documentId: string;
  }>;
  modelId: string;
  aspectRatio: string;
  generatedAt: string;
}

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
    title: varchar('title', { length: 255 }).notNull(),
    status: infographicStatusEnum('status').notNull().default('drafting'),
    infographicType: varchar('infographic_type', { length: 50 }).notNull(),
    aspectRatio: varchar('aspect_ratio', { length: 10 })
      .notNull()
      .default('1:1'),
    customInstructions: text('custom_instructions'),
    feedbackInstructions: text('feedback_instructions'),
    styleOptions: jsonb('style_options').$type<InfographicStyleOptions>(),
    imageUrl: text('image_url'),
    errorMessage: text('error_message'),
    sourceDocumentIds: jsonb('source_document_ids')
      .$type<string[]>()
      .notNull()
      .default([]),
    generationContext:
      jsonb('generation_context').$type<InfographicGenerationContext>(),

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
// Infographic Selection Table
// =============================================================================

/**
 * Infographic selection table.
 * Tracks text selections from documents that make up an infographic.
 */
export const infographicSelection = pgTable(
  'infographic_selection',
  {
    id: varchar('id', { length: 20 })
      .$type<InfographicSelectionId>()
      .$default(generateInfographicSelectionId)
      .primaryKey(),
    infographicId: varchar('infographic_id', { length: 20 })
      .notNull()
      .references(() => infographic.id, { onDelete: 'cascade' })
      .$type<InfographicId>(),
    documentId: varchar('document_id', { length: 20 })
      .notNull()
      .references(() => document.id)
      .$type<DocumentId>(),
    selectedText: text('selected_text').notNull(),
    startOffset: integer('start_offset'),
    endOffset: integer('end_offset'),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('infographic_selection_infographicId_idx').on(table.infographicId),
    index('infographic_selection_infographicId_orderIndex_idx').on(
      table.infographicId,
      table.orderIndex,
    ),
  ],
);

// =============================================================================
// Input Schemas - for API contracts
// =============================================================================

export const CreateInfographicSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  infographicType: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(50),
  ),
});

/**
 * Base fields for infographic updates.
 */
export const UpdateInfographicFields = {
  title: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  ),
  infographicType: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)),
  ),
  aspectRatio: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(10)),
  ),
  customInstructions: Schema.optional(Schema.NullOr(Schema.String)),
  feedbackInstructions: Schema.optional(Schema.NullOr(Schema.String)),
  styleOptions: Schema.optional(
    Schema.NullOr(
      Schema.Struct({
        colorScheme: Schema.optional(Schema.String),
        emphasis: Schema.optional(Schema.Array(Schema.String)),
        layout: Schema.optional(Schema.String),
      }),
    ),
  ),
};

export const UpdateInfographicSchema = Schema.Struct(UpdateInfographicFields);

// =============================================================================
// Enum Schemas - for API contracts
// =============================================================================

/**
 * Infographic status schema.
 * Flow: drafting → generating → ready
 */
export const InfographicStatusSchema = Schema.Union(
  Schema.Literal('drafting'),
  Schema.Literal('generating'),
  Schema.Literal('ready'),
  Schema.Literal('failed'),
);

// =============================================================================
// Output Schemas - for API responses (Date → string)
// =============================================================================

/**
 * Style options output schema.
 */
export const InfographicStyleOptionsOutputSchema = Schema.Struct({
  colorScheme: Schema.optional(Schema.String),
  emphasis: Schema.optional(Schema.Array(Schema.String)),
  layout: Schema.optional(Schema.String),
});

/**
 * Generation context output schema.
 */
export const InfographicGenerationContextOutputSchema = Schema.Struct({
  promptUsed: Schema.String,
  selectionsAtGeneration: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      text: Schema.String,
      documentId: Schema.String,
    }),
  ),
  modelId: Schema.String,
  aspectRatio: Schema.String,
  generatedAt: Schema.String,
});

export const InfographicOutputSchema = Schema.Struct({
  id: InfographicIdSchema,
  title: Schema.String,
  status: InfographicStatusSchema,
  infographicType: Schema.String,
  aspectRatio: Schema.String,
  customInstructions: Schema.NullOr(Schema.String),
  feedbackInstructions: Schema.NullOr(Schema.String),
  styleOptions: Schema.NullOr(InfographicStyleOptionsOutputSchema),
  imageUrl: Schema.NullOr(Schema.String),
  errorMessage: Schema.NullOr(Schema.String),
  sourceDocumentIds: Schema.Array(Schema.String),
  generationContext: Schema.NullOr(InfographicGenerationContextOutputSchema),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const InfographicListItemOutputSchema = Schema.Struct({
  id: InfographicIdSchema,
  title: Schema.String,
  status: InfographicStatusSchema,
  infographicType: Schema.String,
  aspectRatio: Schema.String,
  imageUrl: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const InfographicSelectionOutputSchema = Schema.Struct({
  id: InfographicSelectionIdSchema,
  infographicId: InfographicIdSchema,
  documentId: DocumentIdSchema,
  selectedText: Schema.String,
  startOffset: Schema.NullOr(Schema.Number),
  endOffset: Schema.NullOr(Schema.Number),
  orderIndex: Schema.Number,
  createdAt: Schema.String,
});

// =============================================================================
// Types
// =============================================================================

export type Infographic = typeof infographic.$inferSelect;
export type InfographicStatus = Infographic['status'];
export type InfographicOutput = typeof InfographicOutputSchema.Type;
export type InfographicListItemOutput =
  typeof InfographicListItemOutputSchema.Type;
export type CreateInfographic = typeof CreateInfographicSchema.Type;
export type UpdateInfographic = typeof UpdateInfographicSchema.Type;

export type InfographicSelection = typeof infographicSelection.$inferSelect;
export type InfographicSelectionOutput =
  typeof InfographicSelectionOutputSchema.Type;

// =============================================================================
// Transform Functions - pure DB → API output conversion
// =============================================================================

/**
 * Pure transform for Infographic → InfographicOutput.
 */
const infographicTransform = (infographic: Infographic): InfographicOutput => ({
  id: infographic.id,
  title: infographic.title,
  status: infographic.status,
  infographicType: infographic.infographicType,
  aspectRatio: infographic.aspectRatio,
  customInstructions: infographic.customInstructions ?? null,
  feedbackInstructions: infographic.feedbackInstructions ?? null,
  styleOptions: infographic.styleOptions ?? null,
  imageUrl: infographic.imageUrl ?? null,
  errorMessage: infographic.errorMessage ?? null,
  sourceDocumentIds: infographic.sourceDocumentIds,
  generationContext: infographic.generationContext ?? null,
  createdBy: infographic.createdBy,
  createdAt: infographic.createdAt.toISOString(),
  updatedAt: infographic.updatedAt.toISOString(),
});

/**
 * Pure transform for Infographic list item.
 */
const infographicListItemTransform = (
  infographic: Infographic,
): InfographicListItemOutput => ({
  id: infographic.id,
  title: infographic.title,
  status: infographic.status,
  infographicType: infographic.infographicType,
  aspectRatio: infographic.aspectRatio,
  imageUrl: infographic.imageUrl ?? null,
  createdAt: infographic.createdAt.toISOString(),
  updatedAt: infographic.updatedAt.toISOString(),
});

/**
 * Pure transform for InfographicSelection → InfographicSelectionOutput.
 */
const infographicSelectionTransform = (
  selection: InfographicSelection,
): InfographicSelectionOutput => ({
  id: selection.id,
  infographicId: selection.infographicId,
  documentId: selection.documentId,
  selectedText: selection.selectedText,
  startOffset: selection.startOffset ?? null,
  endOffset: selection.endOffset ?? null,
  orderIndex: selection.orderIndex,
  createdAt: selection.createdAt.toISOString(),
});

/**
 * Full infographic with selections type.
 */
export interface InfographicWithSelections extends Infographic {
  selections: InfographicSelection[];
}

/**
 * Full infographic output with selections.
 */
export interface InfographicFullOutput extends InfographicOutput {
  selections: InfographicSelectionOutput[];
}

/**
 * Pure transform for full Infographic with selections.
 */
const infographicFullTransform = (
  infographic: InfographicWithSelections,
): InfographicFullOutput => ({
  ...infographicTransform(infographic),
  selections: infographic.selections.map(infographicSelectionTransform),
});

// =============================================================================
// Serializers - Effect-based and sync variants
// =============================================================================

// --- Infographic ---

/** Effect-based serializer with tracing. */
export const serializeInfographicEffect = createEffectSerializer(
  'infographic',
  infographicTransform,
);

/** Batch serializer for multiple infographics. */
export const serializeInfographicsEffect = createBatchEffectSerializer(
  'infographic',
  infographicTransform,
);

/** Sync serializer for simple cases. */
export const serializeInfographic = createSyncSerializer(infographicTransform);

// --- InfographicFull (with selections) ---

/** Effect-based serializer with tracing. */
export const serializeInfographicFullEffect = createEffectSerializer(
  'infographicFull',
  infographicFullTransform,
);

/** Sync serializer for simple cases. */
export const serializeInfographicFull = createSyncSerializer(
  infographicFullTransform,
);

// --- InfographicListItem ---

/** Effect-based serializer with tracing. */
export const serializeInfographicListItemEffect = createEffectSerializer(
  'infographicListItem',
  infographicListItemTransform,
);

/** Batch serializer for infographic lists. */
export const serializeInfographicListItemsEffect = createBatchEffectSerializer(
  'infographicListItem',
  infographicListItemTransform,
);

/** Sync serializer for simple cases. */
export const serializeInfographicListItem = createSyncSerializer(
  infographicListItemTransform,
);

// --- InfographicSelection ---

/** Effect-based serializer with tracing. */
export const serializeInfographicSelectionEffect = createEffectSerializer(
  'infographicSelection',
  infographicSelectionTransform,
);

/** Batch serializer for multiple selections. */
export const serializeInfographicSelectionsEffect = createBatchEffectSerializer(
  'infographicSelection',
  infographicSelectionTransform,
);

/** Sync serializer for simple cases. */
export const serializeInfographicSelection = createSyncSerializer(
  infographicSelectionTransform,
);
