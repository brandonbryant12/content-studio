import {
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
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
  type VoiceoverId,
  VoiceoverIdSchema,
  generateVoiceoverId,
} from './brands';

// =============================================================================
// Voiceover Status Enum
// =============================================================================

/**
 * Voiceover status enum.
 * Tracks the voiceover's generation state.
 *
 * Flow: drafting → generating_audio → ready
 */
export const voiceoverStatusEnum = pgEnum('voiceover_status', [
  'drafting', // Initial state, editing text
  'generating_audio', // TTS is generating audio
  'ready', // Fully generated, can edit settings
  'failed', // Generation failed
]);

/**
 * Voiceover status values for runtime usage.
 * Use this instead of magic strings for type-safe status comparisons.
 *
 * @example
 * import { VoiceoverStatus } from '@repo/db/schema';
 * if (voiceover.status === VoiceoverStatus.READY) { ... }
 */
export const VoiceoverStatus = {
  DRAFTING: 'drafting',
  GENERATING_AUDIO: 'generating_audio',
  READY: 'ready',
  FAILED: 'failed',
} as const;

// =============================================================================
// Voiceover Table
// =============================================================================

export const voiceover = pgTable(
  'voiceover',
  {
    id: varchar('id', { length: 20 })
      .$type<VoiceoverId>()
      .$default(generateVoiceoverId)
      .primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    text: text('text').notNull().default(''),
    voice: varchar('voice', { length: 100 }).notNull().default('Charon'),
    voiceName: varchar('voice_name', { length: 100 }),
    audioUrl: varchar('audio_url', { length: 500 }),
    duration: integer('duration'), // seconds
    status: voiceoverStatusEnum('status').notNull().default('drafting'),
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
    index('voiceover_createdBy_idx').on(table.createdBy),
    index('voiceover_status_idx').on(table.status),
  ],
);

// =============================================================================
// Input Schemas - for API contracts
// =============================================================================

export const CreateVoiceoverSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
});

/**
 * Base fields for voiceover updates.
 */
export const UpdateVoiceoverFields = {
  title: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  ),
  text: Schema.optional(Schema.String),
  voice: Schema.optional(Schema.String.pipe(Schema.maxLength(100))),
  voiceName: Schema.optional(
    Schema.NullOr(Schema.String.pipe(Schema.maxLength(100))),
  ),
};

export const UpdateVoiceoverSchema = Schema.Struct(UpdateVoiceoverFields);

// =============================================================================
// Enum Schemas - for API contracts
// =============================================================================

/**
 * Voiceover status schema.
 * Flow: drafting → generating_audio → ready
 */
export const VoiceoverStatusSchema = Schema.Union(
  Schema.Literal('drafting'),
  Schema.Literal('generating_audio'),
  Schema.Literal('ready'),
  Schema.Literal('failed'),
);

// =============================================================================
// Output Schemas - for API responses (Date → string)
// =============================================================================

export const VoiceoverOutputSchema = Schema.Struct({
  id: VoiceoverIdSchema,
  title: Schema.String,
  text: Schema.String,
  voice: Schema.String,
  voiceName: Schema.NullOr(Schema.String),
  audioUrl: Schema.NullOr(Schema.String),
  duration: Schema.NullOr(Schema.Number),
  status: VoiceoverStatusSchema,
  errorMessage: Schema.NullOr(Schema.String),
  approvedBy: Schema.NullOr(Schema.String),
  approvedAt: Schema.NullOr(Schema.String),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const VoiceoverListItemOutputSchema = Schema.Struct({
  ...VoiceoverOutputSchema.fields,
});

// =============================================================================
// Types
// =============================================================================

export type Voiceover = typeof voiceover.$inferSelect;
export type VoiceoverStatus = Voiceover['status'];
export type VoiceoverOutput = typeof VoiceoverOutputSchema.Type;
export type VoiceoverListItemOutput = typeof VoiceoverListItemOutputSchema.Type;
export type CreateVoiceover = typeof CreateVoiceoverSchema.Type;
export type UpdateVoiceover = typeof UpdateVoiceoverSchema.Type;

// =============================================================================
// Transform Functions - pure DB → API output conversion
// =============================================================================

/**
 * Pure transform for Voiceover → VoiceoverOutput.
 */
const voiceoverTransform = (voiceover: Voiceover): VoiceoverOutput => ({
  id: voiceover.id,
  title: voiceover.title,
  text: voiceover.text,
  voice: voiceover.voice,
  voiceName: voiceover.voiceName ?? null,
  audioUrl: voiceover.audioUrl ?? null,
  duration: voiceover.duration ?? null,
  status: voiceover.status,
  errorMessage: voiceover.errorMessage ?? null,
  approvedBy: voiceover.approvedBy ?? null,
  approvedAt: voiceover.approvedAt?.toISOString() ?? null,
  createdBy: voiceover.createdBy,
  createdAt: voiceover.createdAt.toISOString(),
  updatedAt: voiceover.updatedAt.toISOString(),
});

/**
 * Pure transform for Voiceover list item.
 */
const voiceoverListItemTransform = (
  voiceover: Voiceover,
): VoiceoverListItemOutput => ({
  ...voiceoverTransform(voiceover),
});

// =============================================================================
// Serializers - Effect-based and sync variants
// =============================================================================

// --- Voiceover ---

/** Effect-based serializer with tracing. */
export const serializeVoiceoverEffect = createEffectSerializer(
  'voiceover',
  voiceoverTransform,
);

/** Batch serializer for multiple voiceovers. */
export const serializeVoiceoversEffect = createBatchEffectSerializer(
  'voiceover',
  voiceoverTransform,
);

/** Sync serializer for simple cases. */
export const serializeVoiceover = createSyncSerializer(voiceoverTransform);

// --- VoiceoverListItem ---

/** Effect-based serializer with tracing. */
export const serializeVoiceoverListItemEffect = createEffectSerializer(
  'voiceoverListItem',
  voiceoverListItemTransform,
);

/** Batch serializer for voiceover lists. */
export const serializeVoiceoverListItemsEffect = createBatchEffectSerializer(
  'voiceoverListItem',
  voiceoverListItemTransform,
);

/** Sync serializer for simple cases. */
export const serializeVoiceoverListItem = createSyncSerializer(
  voiceoverListItemTransform,
);
