import {
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
  index,
  pgEnum,
  boolean,
  unique,
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
  type VoiceoverCollaboratorId,
  VoiceoverIdSchema,
  VoiceoverCollaboratorIdSchema,
  generateVoiceoverId,
  generateVoiceoverCollaboratorId,
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
    ownerHasApproved: boolean('owner_has_approved').notNull().default(false),

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
// Voiceover Collaborator Table
// =============================================================================

/**
 * Voiceover collaborator table.
 * Tracks users who have been invited to collaborate on a voiceover.
 * - userId is null for pending invites (email-only)
 * - When user signs up, pending invites are claimed by matching email
 */
export const voiceoverCollaborator = pgTable(
  'voiceover_collaborator',
  {
    id: varchar('id', { length: 20 })
      .$type<VoiceoverCollaboratorId>()
      .$default(generateVoiceoverCollaboratorId)
      .primaryKey(),
    voiceoverId: varchar('voiceover_id', { length: 20 })
      .notNull()
      .references(() => voiceover.id, { onDelete: 'cascade' })
      .$type<VoiceoverId>(),
    // userId is null for pending invites (email-only)
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    // Email used for pending invites and display
    email: text('email').notNull(),
    // Approval tracking
    hasApproved: boolean('has_approved').notNull().default(false),
    approvedAt: timestamp('approved_at', { mode: 'date', withTimezone: true }),
    // Audit fields
    addedAt: timestamp('added_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    addedBy: text('added_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('voiceover_collaborator_voiceoverId_idx').on(table.voiceoverId),
    index('voiceover_collaborator_userId_idx').on(table.userId),
    index('voiceover_collaborator_email_idx').on(table.email),
    // Unique constraint: one invite per email per voiceover
    unique('voiceover_collaborator_voiceover_email_unique').on(
      table.voiceoverId,
      table.email,
    ),
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
  ownerHasApproved: Schema.Boolean,
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const VoiceoverListItemOutputSchema = Schema.Struct({
  ...VoiceoverOutputSchema.fields,
});

// =============================================================================
// Collaborator Output Schemas
// =============================================================================

/**
 * Base voiceover collaborator output schema.
 */
export const VoiceoverCollaboratorOutputSchema = Schema.Struct({
  id: VoiceoverCollaboratorIdSchema,
  voiceoverId: VoiceoverIdSchema,
  userId: Schema.NullOr(Schema.String),
  email: Schema.String,
  hasApproved: Schema.Boolean,
  approvedAt: Schema.NullOr(Schema.String),
  addedAt: Schema.String,
  addedBy: Schema.String,
});

/**
 * Collaborator with user details output schema.
 * Includes user name and image when the collaborator is a registered user.
 */
export const VoiceoverCollaboratorWithUserOutputSchema = Schema.Struct({
  ...VoiceoverCollaboratorOutputSchema.fields,
  userName: Schema.NullOr(Schema.String),
  userImage: Schema.NullOr(Schema.String),
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

// Collaborator types
export type VoiceoverCollaborator = typeof voiceoverCollaborator.$inferSelect;
export type VoiceoverCollaboratorOutput =
  typeof VoiceoverCollaboratorOutputSchema.Type;
export type VoiceoverCollaboratorWithUserOutput =
  typeof VoiceoverCollaboratorWithUserOutputSchema.Type;

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
  ownerHasApproved: voiceover.ownerHasApproved,
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

// --- Collaborator ---

/**
 * Input type for collaborator with user serialization.
 */
export interface VoiceoverCollaboratorWithUser extends VoiceoverCollaborator {
  userName: string | null;
  userImage: string | null;
}

/**
 * Pure transform for VoiceoverCollaborator → VoiceoverCollaboratorOutput.
 */
const voiceoverCollaboratorTransform = (
  collaborator: VoiceoverCollaborator,
): VoiceoverCollaboratorOutput => ({
  id: collaborator.id,
  voiceoverId: collaborator.voiceoverId,
  userId: collaborator.userId ?? null,
  email: collaborator.email,
  hasApproved: collaborator.hasApproved,
  approvedAt: collaborator.approvedAt?.toISOString() ?? null,
  addedAt: collaborator.addedAt.toISOString(),
  addedBy: collaborator.addedBy,
});

/**
 * Pure transform for VoiceoverCollaboratorWithUser → VoiceoverCollaboratorWithUserOutput.
 */
const voiceoverCollaboratorWithUserTransform = (
  collaborator: VoiceoverCollaboratorWithUser,
): VoiceoverCollaboratorWithUserOutput => ({
  ...voiceoverCollaboratorTransform(collaborator),
  userName: collaborator.userName,
  userImage: collaborator.userImage,
});

/** Effect-based serializer with tracing. */
export const serializeVoiceoverCollaboratorEffect = createEffectSerializer(
  'voiceoverCollaborator',
  voiceoverCollaboratorTransform,
);

/** Batch serializer for multiple collaborators. */
export const serializeVoiceoverCollaboratorsEffect =
  createBatchEffectSerializer(
    'voiceoverCollaborator',
    voiceoverCollaboratorTransform,
  );

/** Sync serializer for simple cases. */
export const serializeVoiceoverCollaborator = createSyncSerializer(
  voiceoverCollaboratorTransform,
);

/** Effect-based serializer for collaborator with user. */
export const serializeVoiceoverCollaboratorWithUserEffect =
  createEffectSerializer(
    'voiceoverCollaboratorWithUser',
    voiceoverCollaboratorWithUserTransform,
  );

/** Batch serializer for collaborators with user info. */
export const serializeVoiceoverCollaboratorsWithUserEffect =
  createBatchEffectSerializer(
    'voiceoverCollaboratorWithUser',
    voiceoverCollaboratorWithUserTransform,
  );

/** Sync serializer for collaborator with user. */
export const serializeVoiceoverCollaboratorWithUser = createSyncSerializer(
  voiceoverCollaboratorWithUserTransform,
);
