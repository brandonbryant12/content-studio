import {
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
  jsonb,
  index,
  pgEnum,
  boolean,
  unique,
} from 'drizzle-orm/pg-core';
import { Schema } from 'effect';
import { user } from './auth';
import {
  DocumentOutputSchema,
  serializeDocument,
  type Document,
} from './documents';
import {
  createEffectSerializer,
  createBatchEffectSerializer,
  createSyncSerializer,
} from './serialization';
import {
  type PodcastId,
  type DocumentId,
  type CollaboratorId,
  PodcastIdSchema,
  DocumentIdSchema,
  CollaboratorIdSchema,
  generatePodcastId,
  generateCollaboratorId,
} from './brands';

export const podcastFormatEnum = pgEnum('podcast_format', [
  'voice_over',
  'conversation',
]);

/**
 * Podcast status enum.
 * Tracks the podcast's generation state.
 *
 * Flow: drafting → generating_script → script_ready → generating_audio → ready
 */
export const versionStatusEnum = pgEnum('version_status', [
  'drafting', // Initial state, no content yet
  'generating_script', // LLM is generating the script
  'script_ready', // Script generated, awaiting audio generation
  'generating_audio', // TTS is generating audio
  'ready', // Fully generated, can edit settings
  'failed', // Generation failed
]);

/**
 * Version status values for runtime usage.
 * Use this instead of magic strings for type-safe status comparisons.
 *
 * @example
 * import { VersionStatus } from '@repo/db/schema';
 * if (podcast.status === VersionStatus.READY) { ... }
 */
export const VersionStatus = {
  DRAFTING: 'drafting',
  GENERATING_SCRIPT: 'generating_script',
  SCRIPT_READY: 'script_ready',
  GENERATING_AUDIO: 'generating_audio',
  READY: 'ready',
  FAILED: 'failed',
} as const;

/**
 * Generation context stored with AI-generated content.
 * Tracks the exact prompts and parameters used for reproducibility.
 */
export interface GenerationContext {
  systemPromptTemplate: string;
  userInstructions: string;
  sourceDocuments: Array<{
    id: string;
    title: string;
    contentHash?: string;
  }>;
  modelId: string;
  modelParams?: {
    temperature?: number;
    maxTokens?: number;
    [key: string]: unknown;
  };
  generatedAt: string;
}

export interface ScriptSegment {
  speaker: string;
  line: string;
  index: number;
}

export const podcast = pgTable(
  'podcast',
  {
    id: varchar('id', { length: 20 })
      .$type<PodcastId>()
      .$default(generatePodcastId)
      .primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    format: podcastFormatEnum('format').notNull(),

    // Voice configuration
    hostVoice: text('hostVoice'),
    hostVoiceName: text('hostVoiceName'),
    coHostVoice: text('coHostVoice'),
    coHostVoiceName: text('coHostVoiceName'),
    promptInstructions: text('promptInstructions'),
    targetDurationMinutes: integer('targetDurationMinutes').default(5),
    tags: jsonb('tags').$type<string[]>().default([]),

    // Source documents used to generate this podcast
    sourceDocumentIds: varchar('sourceDocumentIds', { length: 20 })
      .array()
      .$type<DocumentId[]>()
      .notNull()
      .default([]),

    // Generation context for audit trail
    generationContext: jsonb('generationContext').$type<GenerationContext>(),

    // === Script fields (flattened from podcastScript) ===
    status: versionStatusEnum('status').notNull().default('drafting'),
    segments: jsonb('segments').$type<ScriptSegment[]>(),
    summary: text('summary'),
    generationPrompt: text('generationPrompt'),
    audioUrl: text('audioUrl'),
    duration: integer('duration'), // seconds
    errorMessage: text('errorMessage'),
    ownerHasApproved: boolean('ownerHasApproved').notNull().default(false),

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
    index('podcast_createdBy_idx').on(table.createdBy),
    index('podcast_status_idx').on(table.status),
  ],
);

// =============================================================================
// Podcast Collaborator Table
// =============================================================================

/**
 * Podcast collaborator table.
 * Tracks users who have been invited to collaborate on a podcast.
 * - userId is null for pending invites (email-only)
 * - When user signs up, pending invites are claimed by matching email
 */
export const podcastCollaborator = pgTable(
  'podcastCollaborator',
  {
    id: varchar('id', { length: 20 })
      .$type<CollaboratorId>()
      .$default(generateCollaboratorId)
      .primaryKey(),
    podcastId: varchar('podcastId', { length: 20 })
      .notNull()
      .references(() => podcast.id, { onDelete: 'cascade' })
      .$type<PodcastId>(),
    // userId is null for pending invites (email-only)
    userId: text('userId').references(() => user.id, { onDelete: 'cascade' }),
    // Email used for pending invites and display
    email: text('email').notNull(),
    // Approval tracking
    hasApproved: boolean('hasApproved').notNull().default(false),
    approvedAt: timestamp('approvedAt', { mode: 'date', withTimezone: true }),
    // Audit fields
    addedAt: timestamp('addedAt', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    addedBy: text('addedBy')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('collaborator_podcastId_idx').on(table.podcastId),
    index('collaborator_userId_idx').on(table.userId),
    index('collaborator_email_idx').on(table.email),
    // Unique constraint: one invite per email per podcast
    unique('collaborator_podcast_email_unique').on(
      table.podcastId,
      table.email,
    ),
  ],
);

export const CreatePodcastSchema = Schema.Struct({
  title: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  ),
  description: Schema.optional(Schema.String),
  format: Schema.Union(
    Schema.Literal('voice_over'),
    Schema.Literal('conversation'),
  ),
  documentIds: Schema.optional(Schema.Array(DocumentIdSchema)),
  promptInstructions: Schema.optional(Schema.String),
  targetDurationMinutes: Schema.optional(
    Schema.Number.pipe(
      Schema.greaterThanOrEqualTo(1),
      Schema.lessThanOrEqualTo(60),
    ),
  ),
  hostVoice: Schema.optional(Schema.String),
  hostVoiceName: Schema.optional(Schema.String),
  coHostVoice: Schema.optional(Schema.String),
  coHostVoiceName: Schema.optional(Schema.String),
});

/**
 * Base fields for podcast updates.
 * Exported separately for use in API contracts that need to spread fields.
 */
export const UpdatePodcastFields = {
  title: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  ),
  description: Schema.optional(Schema.String),
  promptInstructions: Schema.optional(Schema.String),
  targetDurationMinutes: Schema.optional(
    Schema.Number.pipe(
      Schema.greaterThanOrEqualTo(1),
      Schema.lessThanOrEqualTo(60),
    ),
  ),
  hostVoice: Schema.optional(Schema.String),
  hostVoiceName: Schema.optional(Schema.String),
  coHostVoice: Schema.optional(Schema.String),
  coHostVoiceName: Schema.optional(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
  documentIds: Schema.optional(Schema.Array(DocumentIdSchema)),
};

export const UpdatePodcastSchema = Schema.Struct(UpdatePodcastFields);

export const UpdateScriptSchema = Schema.Struct({
  segments: Schema.Array(
    Schema.Struct({
      speaker: Schema.String,
      line: Schema.String,
      index: Schema.Number,
    }),
  ),
});

// =============================================================================
// Enum Schemas - for API contracts
// =============================================================================

export const PodcastFormatSchema = Schema.Union(
  Schema.Literal('voice_over'),
  Schema.Literal('conversation'),
);

/**
 * Version-level status schema.
 * Flow: drafting → generating_script → script_ready → generating_audio → ready
 */
export const VersionStatusSchema = Schema.Union(
  Schema.Literal('drafting'),
  Schema.Literal('generating_script'),
  Schema.Literal('script_ready'),
  Schema.Literal('generating_audio'),
  Schema.Literal('ready'),
  Schema.Literal('failed'),
);

// =============================================================================
// Output Schemas - for API responses (Date → string)
// =============================================================================

export const GenerationContextOutputSchema = Schema.Struct({
  systemPromptTemplate: Schema.String,
  userInstructions: Schema.String,
  sourceDocuments: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      title: Schema.String,
      contentHash: Schema.optional(Schema.String),
    }),
  ),
  modelId: Schema.String,
  modelParams: Schema.optional(
    Schema.Struct({
      temperature: Schema.optional(Schema.Number),
      maxTokens: Schema.optional(Schema.Number),
    }),
  ),
  generatedAt: Schema.String,
});

/**
 * Script segment schema for API contracts.
 */
export const ScriptSegmentSchema = Schema.Struct({
  speaker: Schema.String,
  line: Schema.String,
  index: Schema.Number,
});

export const PodcastOutputSchema = Schema.Struct({
  id: PodcastIdSchema,
  title: Schema.String,
  description: Schema.NullOr(Schema.String),
  format: PodcastFormatSchema,

  // Voice configuration
  hostVoice: Schema.NullOr(Schema.String),
  hostVoiceName: Schema.NullOr(Schema.String),
  coHostVoice: Schema.NullOr(Schema.String),
  coHostVoiceName: Schema.NullOr(Schema.String),
  promptInstructions: Schema.NullOr(Schema.String),
  targetDurationMinutes: Schema.NullOr(Schema.Number),
  tags: Schema.Array(Schema.String),
  sourceDocumentIds: Schema.Array(DocumentIdSchema),

  generationContext: Schema.NullOr(GenerationContextOutputSchema),

  // Script fields (flattened)
  status: VersionStatusSchema,
  segments: Schema.NullOr(Schema.Array(ScriptSegmentSchema)),
  summary: Schema.NullOr(Schema.String),
  generationPrompt: Schema.NullOr(Schema.String),
  audioUrl: Schema.NullOr(Schema.String),
  duration: Schema.NullOr(Schema.Number),
  errorMessage: Schema.NullOr(Schema.String),
  ownerHasApproved: Schema.Boolean,

  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

/**
 * Full podcast output schema (podcast + documents).
 */
export const PodcastFullOutputSchema = Schema.Struct({
  ...PodcastOutputSchema.fields,
  documents: Schema.Array(DocumentOutputSchema),
});

/**
 * Podcast list item output schema (podcast with status and duration).
 */
export const PodcastListItemOutputSchema = Schema.Struct({
  ...PodcastOutputSchema.fields,
});

// =============================================================================
// Collaborator Output Schemas
// =============================================================================

/**
 * Base collaborator output schema.
 */
export const CollaboratorOutputSchema = Schema.Struct({
  id: CollaboratorIdSchema,
  podcastId: PodcastIdSchema,
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
export const CollaboratorWithUserOutputSchema = Schema.Struct({
  ...CollaboratorOutputSchema.fields,
  userName: Schema.NullOr(Schema.String),
  userImage: Schema.NullOr(Schema.String),
});

// =============================================================================
// Types
// =============================================================================

export type Podcast = typeof podcast.$inferSelect;
export type PodcastFormat = Podcast['format'];
export type VersionStatus = Podcast['status'];
export type GenerationContextOutput = typeof GenerationContextOutputSchema.Type;
export type PodcastOutput = typeof PodcastOutputSchema.Type;
export type PodcastFullOutput = typeof PodcastFullOutputSchema.Type;
export type PodcastListItemOutput = typeof PodcastListItemOutputSchema.Type;
export type CreatePodcast = typeof CreatePodcastSchema.Type;
export type UpdatePodcast = typeof UpdatePodcastSchema.Type;
export type UpdateScript = typeof UpdateScriptSchema.Type;

// Collaborator types
export type Collaborator = typeof podcastCollaborator.$inferSelect;
export type CollaboratorOutput = typeof CollaboratorOutputSchema.Type;
export type CollaboratorWithUserOutput =
  typeof CollaboratorWithUserOutputSchema.Type;

// =============================================================================
// Transform Functions - pure DB → API output conversion
// =============================================================================

/**
 * Pure transform for Podcast → PodcastOutput.
 * Includes all flattened script fields.
 */
const podcastTransform = (podcast: Podcast): PodcastOutput => ({
  id: podcast.id,
  title: podcast.title,
  description: podcast.description,
  format: podcast.format,
  hostVoice: podcast.hostVoice,
  hostVoiceName: podcast.hostVoiceName,
  coHostVoice: podcast.coHostVoice,
  coHostVoiceName: podcast.coHostVoiceName,
  promptInstructions: podcast.promptInstructions,
  targetDurationMinutes: podcast.targetDurationMinutes,
  tags: podcast.tags ?? [],
  sourceDocumentIds: podcast.sourceDocumentIds ?? [],
  generationContext: podcast.generationContext ?? null,
  // Script fields (flattened)
  status: podcast.status,
  segments: podcast.segments ?? null,
  summary: podcast.summary ?? null,
  generationPrompt: podcast.generationPrompt ?? null,
  audioUrl: podcast.audioUrl ?? null,
  duration: podcast.duration ?? null,
  errorMessage: podcast.errorMessage ?? null,
  ownerHasApproved: podcast.ownerHasApproved,
  createdBy: podcast.createdBy,
  createdAt: podcast.createdAt.toISOString(),
  updatedAt: podcast.updatedAt.toISOString(),
});

/**
 * Input type for full podcast serialization.
 */
type PodcastWithDocuments = Podcast & {
  documents: Document[];
};

/**
 * Pure transform for full Podcast with documents.
 */
const podcastFullTransform = (
  podcast: PodcastWithDocuments,
): PodcastFullOutput => ({
  ...podcastTransform(podcast),
  documents: podcast.documents.map(serializeDocument),
});

/**
 * Pure transform for Podcast list item.
 */
const podcastListItemTransform = (podcast: Podcast): PodcastListItemOutput => ({
  ...podcastTransform(podcast),
});

// =============================================================================
// Serializers - Effect-based and sync variants
// =============================================================================

// --- Podcast ---

/** Effect-based serializer with tracing. */
export const serializePodcastEffect = createEffectSerializer(
  'podcast',
  podcastTransform,
);

/** Batch serializer for multiple podcasts. */
export const serializePodcastsEffect = createBatchEffectSerializer(
  'podcast',
  podcastTransform,
);

/** Sync serializer for simple cases. */
export const serializePodcast = createSyncSerializer(podcastTransform);

// --- PodcastFull (with documents) ---

/** Effect-based serializer with tracing. */
export const serializePodcastFullEffect = createEffectSerializer(
  'podcastFull',
  podcastFullTransform,
);

/** Sync serializer for simple cases. */
export const serializePodcastFull = createSyncSerializer(podcastFullTransform);

// --- PodcastListItem ---

/** Effect-based serializer with tracing. */
export const serializePodcastListItemEffect = createEffectSerializer(
  'podcastListItem',
  podcastListItemTransform,
);

/** Batch serializer for podcast lists. */
export const serializePodcastListItemsEffect = createBatchEffectSerializer(
  'podcastListItem',
  podcastListItemTransform,
);

/** Sync serializer for simple cases. */
export const serializePodcastListItem = createSyncSerializer(
  podcastListItemTransform,
);

// --- Collaborator ---

/**
 * Input type for collaborator with user serialization.
 */
export interface CollaboratorWithUser extends Collaborator {
  userName: string | null;
  userImage: string | null;
}

/**
 * Pure transform for Collaborator → CollaboratorOutput.
 */
const collaboratorTransform = (
  collaborator: Collaborator,
): CollaboratorOutput => ({
  id: collaborator.id,
  podcastId: collaborator.podcastId,
  userId: collaborator.userId ?? null,
  email: collaborator.email,
  hasApproved: collaborator.hasApproved,
  approvedAt: collaborator.approvedAt?.toISOString() ?? null,
  addedAt: collaborator.addedAt.toISOString(),
  addedBy: collaborator.addedBy,
});

/**
 * Pure transform for CollaboratorWithUser → CollaboratorWithUserOutput.
 */
const collaboratorWithUserTransform = (
  collaborator: CollaboratorWithUser,
): CollaboratorWithUserOutput => ({
  ...collaboratorTransform(collaborator),
  userName: collaborator.userName,
  userImage: collaborator.userImage,
});

/** Effect-based serializer with tracing. */
export const serializeCollaboratorEffect = createEffectSerializer(
  'collaborator',
  collaboratorTransform,
);

/** Batch serializer for multiple collaborators. */
export const serializeCollaboratorsEffect = createBatchEffectSerializer(
  'collaborator',
  collaboratorTransform,
);

/** Sync serializer for simple cases. */
export const serializeCollaborator = createSyncSerializer(
  collaboratorTransform,
);

/** Effect-based serializer for collaborator with user. */
export const serializeCollaboratorWithUserEffect = createEffectSerializer(
  'collaboratorWithUser',
  collaboratorWithUserTransform,
);

/** Batch serializer for collaborators with user info. */
export const serializeCollaboratorsWithUserEffect = createBatchEffectSerializer(
  'collaboratorWithUser',
  collaboratorWithUserTransform,
);

/** Sync serializer for collaborator with user. */
export const serializeCollaboratorWithUser = createSyncSerializer(
  collaboratorWithUserTransform,
);
