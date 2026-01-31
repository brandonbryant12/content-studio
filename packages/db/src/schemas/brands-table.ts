import {
  pgTable,
  text,
  timestamp,
  varchar,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { Schema } from 'effect';
import { user } from './auth';
import {
  createEffectSerializer,
  createBatchEffectSerializer,
  createSyncSerializer,
} from './serialization';
import { type BrandId, BrandIdSchema, generateBrandId } from './brands';

// =============================================================================
// JSONB Types
// =============================================================================

/**
 * Chat message stored in brand's conversation history.
 */
export interface BrandChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * Brand persona with TTS voice mapping.
 * Used for podcast voice selection.
 */
export interface BrandPersona {
  id: string;
  name: string;
  role: string;
  voiceId: string;
  personalityDescription: string;
  speakingStyle: string;
  exampleQuotes: string[];
}

/**
 * Target audience segment with messaging guidance.
 */
export interface BrandSegment {
  id: string;
  name: string;
  description: string;
  messagingTone: string;
  keyBenefits: string[];
}

/**
 * Brand color palette.
 */
export interface BrandColors {
  primary: string;
  secondary?: string;
  accent?: string;
}

// =============================================================================
// Table Definition
// =============================================================================

export const brand = pgTable(
  'brand',
  {
    id: varchar('id', { length: 20 })
      .$type<BrandId>()
      .$default(generateBrandId)
      .primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    mission: text('mission'),
    values: jsonb('values').$type<string[]>().default([]),
    colors: jsonb('colors').$type<BrandColors>(),
    brandGuide: text('brand_guide'),
    chatMessages: jsonb('chat_messages')
      .$type<BrandChatMessage[]>()
      .default([]),
    personas: jsonb('personas').$type<BrandPersona[]>().default([]),
    segments: jsonb('segments').$type<BrandSegment[]>().default([]),
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
  (table) => [index('brand_createdBy_idx').on(table.createdBy)],
);

// =============================================================================
// Input Schemas - for creating/updating
// =============================================================================

export const BrandChatMessageSchema = Schema.Struct({
  role: Schema.Union(Schema.Literal('user'), Schema.Literal('assistant')),
  content: Schema.String,
  timestamp: Schema.String,
});

export const BrandPersonaSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  role: Schema.String,
  voiceId: Schema.String,
  personalityDescription: Schema.String,
  speakingStyle: Schema.String,
  exampleQuotes: Schema.Array(Schema.String),
});

export const BrandSegmentSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  messagingTone: Schema.String,
  keyBenefits: Schema.Array(Schema.String),
});

export const BrandColorsSchema = Schema.Struct({
  primary: Schema.String,
  secondary: Schema.optional(Schema.String),
  accent: Schema.optional(Schema.String),
});

export const CreateBrandSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  description: Schema.optional(Schema.String),
  mission: Schema.optional(Schema.String),
  values: Schema.optional(Schema.Array(Schema.String)),
  colors: Schema.optional(BrandColorsSchema),
  brandGuide: Schema.optional(Schema.String),
  personas: Schema.optional(Schema.Array(BrandPersonaSchema)),
  segments: Schema.optional(Schema.Array(BrandSegmentSchema)),
});

/**
 * Base fields for brand updates.
 * Exported separately for use in API contracts that need to spread fields.
 */
export const UpdateBrandFields = {
  name: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  ),
  description: Schema.optional(Schema.String),
  mission: Schema.optional(Schema.String),
  values: Schema.optional(Schema.Array(Schema.String)),
  colors: Schema.optional(BrandColorsSchema),
  brandGuide: Schema.optional(Schema.String),
  personas: Schema.optional(Schema.Array(BrandPersonaSchema)),
  segments: Schema.optional(Schema.Array(BrandSegmentSchema)),
};

export const UpdateBrandSchema = Schema.Struct(UpdateBrandFields);

// =============================================================================
// Output Schemas - for API responses (Date → string)
// =============================================================================

export const BrandChatMessageOutputSchema = Schema.Struct({
  role: Schema.Union(Schema.Literal('user'), Schema.Literal('assistant')),
  content: Schema.String,
  timestamp: Schema.String,
});

export const BrandPersonaOutputSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  role: Schema.String,
  voiceId: Schema.String,
  personalityDescription: Schema.String,
  speakingStyle: Schema.String,
  exampleQuotes: Schema.Array(Schema.String),
});

export const BrandSegmentOutputSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  messagingTone: Schema.String,
  keyBenefits: Schema.Array(Schema.String),
});

export const BrandColorsOutputSchema = Schema.Struct({
  primary: Schema.String,
  secondary: Schema.NullOr(Schema.String),
  accent: Schema.NullOr(Schema.String),
});

export const BrandOutputSchema = Schema.Struct({
  id: BrandIdSchema,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  mission: Schema.NullOr(Schema.String),
  values: Schema.Array(Schema.String),
  colors: Schema.NullOr(BrandColorsOutputSchema),
  brandGuide: Schema.NullOr(Schema.String),
  chatMessages: Schema.Array(BrandChatMessageOutputSchema),
  personas: Schema.Array(BrandPersonaOutputSchema),
  segments: Schema.Array(BrandSegmentOutputSchema),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

/**
 * Brand list item output schema (same as full for now).
 */
export const BrandListItemOutputSchema = Schema.Struct({
  id: BrandIdSchema,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  mission: Schema.NullOr(Schema.String),
  values: Schema.Array(Schema.String),
  colors: Schema.NullOr(BrandColorsOutputSchema),
  personaCount: Schema.Number,
  segmentCount: Schema.Number,
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

// =============================================================================
// Types
// =============================================================================

export type Brand = typeof brand.$inferSelect;
export type BrandOutput = typeof BrandOutputSchema.Type;
export type BrandListItemOutput = typeof BrandListItemOutputSchema.Type;
export type CreateBrand = typeof CreateBrandSchema.Type;
export type UpdateBrand = typeof UpdateBrandSchema.Type;

// =============================================================================
// Transform Functions - pure DB → API output conversion
// =============================================================================

/**
 * Serialize colors, handling optional fields.
 */
const serializeColors = (colors: BrandColors | null): BrandOutput['colors'] => {
  if (!colors) return null;
  return {
    primary: colors.primary,
    secondary: colors.secondary ?? null,
    accent: colors.accent ?? null,
  };
};

/**
 * Pure transform for Brand → BrandOutput.
 */
const brandTransform = (brand: Brand): BrandOutput => ({
  id: brand.id,
  name: brand.name,
  description: brand.description ?? null,
  mission: brand.mission ?? null,
  values: brand.values ?? [],
  colors: serializeColors(brand.colors ?? null),
  brandGuide: brand.brandGuide ?? null,
  chatMessages: brand.chatMessages ?? [],
  personas: brand.personas ?? [],
  segments: brand.segments ?? [],
  createdBy: brand.createdBy,
  createdAt: brand.createdAt.toISOString(),
  updatedAt: brand.updatedAt.toISOString(),
});

/**
 * Pure transform for Brand list item (excludes chat messages, includes counts).
 */
const brandListItemTransform = (brand: Brand): BrandListItemOutput => ({
  id: brand.id,
  name: brand.name,
  description: brand.description ?? null,
  mission: brand.mission ?? null,
  values: brand.values ?? [],
  colors: serializeColors(brand.colors ?? null),
  personaCount: (brand.personas ?? []).length,
  segmentCount: (brand.segments ?? []).length,
  createdBy: brand.createdBy,
  createdAt: brand.createdAt.toISOString(),
  updatedAt: brand.updatedAt.toISOString(),
});

// =============================================================================
// Serializers - Effect-based and sync variants
// =============================================================================

/** Effect-based serializer with tracing. */
export const serializeBrandEffect = createEffectSerializer(
  'brand',
  brandTransform,
);

/** Batch serializer for multiple brands. */
export const serializeBrandsEffect = createBatchEffectSerializer(
  'brand',
  brandTransform,
);

/** Sync serializer for simple cases. */
export const serializeBrand = createSyncSerializer(brandTransform);

/** Effect-based serializer for brand list items. */
export const serializeBrandListItemEffect = createEffectSerializer(
  'brandListItem',
  brandListItemTransform,
);

/** Batch serializer for brand list items. */
export const serializeBrandListItemsEffect = createBatchEffectSerializer(
  'brandListItem',
  brandListItemTransform,
);

/** Sync serializer for brand list items. */
export const serializeBrandListItem = createSyncSerializer(
  brandListItemTransform,
);
