import {
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { Schema } from 'effect';
import { user } from './auth';
import {
  type InfographicStylePresetId,
  InfographicStylePresetIdSchema,
  generateInfographicStylePresetId,
} from './brands';
import { type StyleProperty, StylePropertiesSchema } from './infographics';
import {
  createEffectSerializer,
  createBatchEffectSerializer,
} from './serialization';

// =============================================================================
// Table
// =============================================================================

export const infographicStylePreset = pgTable('infographic_style_preset', {
  id: varchar('id', { length: 21 })
    .$type<InfographicStylePresetId>()
    .$default(generateInfographicStylePresetId)
    .primaryKey(),
  name: text('name').notNull(),
  properties: jsonb('properties')
    .$type<StyleProperty[]>()
    .notNull()
    .default([]),
  isBuiltIn: boolean('is_built_in').notNull().default(false),
  createdBy: text('created_by').references(() => user.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .notNull()
    .defaultNow(),
});

// =============================================================================
// Effect Schemas
// =============================================================================

export const StylePresetOutputSchema = Schema.Struct({
  id: InfographicStylePresetIdSchema,
  name: Schema.String,
  properties: StylePropertiesSchema,
  isBuiltIn: Schema.Boolean,
  createdBy: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const CreateStylePresetSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  properties: StylePropertiesSchema,
});

export const UpdateStylePresetSchema = Schema.Struct({
  id: InfographicStylePresetIdSchema,
  name: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  ),
  properties: Schema.optional(StylePropertiesSchema),
});

// =============================================================================
// Types
// =============================================================================

export type InfographicStylePreset = typeof infographicStylePreset.$inferSelect;
export type StylePresetOutput = typeof StylePresetOutputSchema.Type;
export type CreateStylePreset = typeof CreateStylePresetSchema.Type;
export type UpdateStylePreset = typeof UpdateStylePresetSchema.Type;

// =============================================================================
// Serialization
// =============================================================================

const stylePresetTransform = (
  row: InfographicStylePreset,
): StylePresetOutput => ({
  id: row.id,
  name: row.name,
  properties: row.properties ?? [],
  isBuiltIn: row.isBuiltIn,
  createdBy: row.createdBy ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const serializeStylePresetEffect = createEffectSerializer(
  'stylePreset',
  stylePresetTransform,
);

export const serializeStylePresetsEffect = createBatchEffectSerializer(
  'stylePreset',
  stylePresetTransform,
);

export const serializeStylePreset = stylePresetTransform;
