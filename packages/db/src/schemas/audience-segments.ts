import { pgTable, text, timestamp, varchar, index } from 'drizzle-orm/pg-core';
import { Schema } from 'effect';
import { user } from './auth';
import {
  createEffectSerializer,
  createBatchEffectSerializer,
  createSyncSerializer,
} from './serialization';
import {
  type AudienceSegmentId,
  AudienceSegmentIdSchema,
  generateAudienceSegmentId,
} from './brands';

// =============================================================================
// Table
// =============================================================================

export const audienceSegment = pgTable(
  'audience_segment',
  {
    id: varchar('id', { length: 20 })
      .$type<AudienceSegmentId>()
      .$default(generateAudienceSegmentId)
      .primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    messagingTone: text('messagingTone'),
    keyInterests: text('keyInterests'),
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
  (table) => [index('audience_segment_createdBy_idx').on(table.createdBy)],
);

// =============================================================================
// Input Schemas
// =============================================================================

export const CreateAudienceSegmentSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  description: Schema.optional(Schema.String),
  messagingTone: Schema.optional(Schema.String),
  keyInterests: Schema.optional(Schema.String),
});

export const UpdateAudienceSegmentSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  ),
  description: Schema.optional(Schema.String),
  messagingTone: Schema.optional(Schema.String),
  keyInterests: Schema.optional(Schema.String),
});

// =============================================================================
// Output Schema
// =============================================================================

export const AudienceSegmentOutputSchema = Schema.Struct({
  id: AudienceSegmentIdSchema,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  messagingTone: Schema.NullOr(Schema.String),
  keyInterests: Schema.NullOr(Schema.String),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

// =============================================================================
// Types
// =============================================================================

export type AudienceSegment = typeof audienceSegment.$inferSelect;
export type AudienceSegmentOutput = typeof AudienceSegmentOutputSchema.Type;
export type CreateAudienceSegment = typeof CreateAudienceSegmentSchema.Type;
export type UpdateAudienceSegment = typeof UpdateAudienceSegmentSchema.Type;

// =============================================================================
// Transform Functions
// =============================================================================

const audienceSegmentTransform = (
  seg: AudienceSegment,
): AudienceSegmentOutput => ({
  id: seg.id,
  name: seg.name,
  description: seg.description ?? null,
  messagingTone: seg.messagingTone ?? null,
  keyInterests: seg.keyInterests ?? null,
  createdBy: seg.createdBy,
  createdAt: seg.createdAt.toISOString(),
  updatedAt: seg.updatedAt.toISOString(),
});

// =============================================================================
// Serializers
// =============================================================================

export const serializeAudienceSegmentEffect = createEffectSerializer(
  'audienceSegment',
  audienceSegmentTransform,
);

export const serializeAudienceSegmentsEffect = createBatchEffectSerializer(
  'audienceSegment',
  audienceSegmentTransform,
);

export const serializeAudienceSegment = createSyncSerializer(
  audienceSegmentTransform,
);
