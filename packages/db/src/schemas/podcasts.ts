import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  index,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-valibot';
import * as v from 'valibot';
import { user } from './auth';
import {
  document,
  DocumentOutputSchema,
  serializeDocument,
  type Document,
  type DocumentOutput,
} from './documents';
import { project } from './projects';

export const podcastFormatEnum = pgEnum('podcast_format', [
  'voice_over',
  'conversation',
]);
export const podcastStatusEnum = pgEnum('podcast_status', [
  'draft',
  'generating_script',
  'script_ready',
  'generating_audio',
  'ready',
  'failed',
]);
export const publishStatusEnum = pgEnum('publish_status', [
  'draft',
  'ready',
  'published',
  'rejected',
]);

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

export const podcast = pgTable(
  'podcast',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    format: podcastFormatEnum('format').notNull(),
    status: podcastStatusEnum('status').notNull().default('draft'),
    hostVoice: text('host_voice'),
    hostVoiceName: text('host_voice_name'),
    coHostVoice: text('co_host_voice'),
    coHostVoiceName: text('co_host_voice_name'),
    promptInstructions: text('prompt_instructions'),
    targetDurationMinutes: integer('target_duration_minutes').default(5),
    audioUrl: text('audio_url'),
    duration: integer('duration'),
    errorMessage: text('error_message'),
    tags: jsonb('tags').$type<string[]>().default([]),

    // Source documents (replaces mediaSource junction table)
    sourceDocumentIds: uuid('source_document_ids')
      .array()
      .notNull()
      .default([]),

    // Generation context for audit trail
    generationContext: jsonb('generation_context').$type<GenerationContext>(),

    // Publishing/compliance fields
    publishStatus: publishStatusEnum('publish_status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { mode: 'date', withTimezone: true }),
    publishedBy: text('published_by').references(() => user.id),

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
    index('podcast_project_id_idx').on(table.projectId),
    index('podcast_created_by_idx').on(table.createdBy),
    index('podcast_status_idx').on(table.status),
    index('podcast_publish_status_idx').on(table.publishStatus),
  ],
);

export interface ScriptSegment {
  speaker: string;
  line: string;
  index: number;
}

export const podcastScript = pgTable(
  'podcast_script',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    podcastId: uuid('podcast_id')
      .notNull()
      .references(() => podcast.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    segments: jsonb('segments').$type<ScriptSegment[]>().notNull(),
    summary: text('summary'),
    generationPrompt: text('generation_prompt'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('podcast_script_podcast_id_idx').on(table.podcastId)],
);

export const CreatePodcastSchema = v.object({
  projectId: v.pipe(v.string(), v.uuid()),
  title: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(256))),
  description: v.optional(v.string()),
  format: v.picklist(['voice_over', 'conversation']),
  documentIds: v.pipe(v.array(v.pipe(v.string(), v.uuid())), v.minLength(1)),
  promptInstructions: v.optional(v.string()),
  targetDurationMinutes: v.optional(
    v.pipe(v.number(), v.minValue(1), v.maxValue(60)),
  ),
  hostVoice: v.optional(v.string()),
  hostVoiceName: v.optional(v.string()),
  coHostVoice: v.optional(v.string()),
  coHostVoiceName: v.optional(v.string()),
});

export const UpdatePodcastSchema = v.partial(
  v.object({
    title: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
    description: v.optional(v.string()),
    promptInstructions: v.optional(v.string()),
    targetDurationMinutes: v.optional(
      v.pipe(v.number(), v.minValue(1), v.maxValue(60)),
    ),
    hostVoice: v.optional(v.string()),
    hostVoiceName: v.optional(v.string()),
    coHostVoice: v.optional(v.string()),
    coHostVoiceName: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    documentIds: v.optional(v.array(v.string())),
  }),
);

export const UpdateScriptSchema = v.object({
  segments: v.array(
    v.object({
      speaker: v.string(),
      line: v.string(),
      index: v.number(),
    }),
  ),
});

export const PodcastSchema = createSelectSchema(podcast);
export const PodcastScriptSchema = createSelectSchema(podcastScript);

// =============================================================================
// Enum Schemas - for API contracts
// =============================================================================

export const PodcastFormatSchema = v.picklist(['voice_over', 'conversation']);
export const PodcastStatusSchema = v.picklist([
  'draft',
  'generating_script',
  'script_ready',
  'generating_audio',
  'ready',
  'failed',
]);
export const PublishStatusSchema = v.picklist([
  'draft',
  'ready',
  'published',
  'rejected',
]);

// =============================================================================
// Output Schemas - for API responses (Date → string)
// =============================================================================

export const PodcastOutputSchema = v.object({
  id: v.string(),
  projectId: v.string(),
  title: v.string(),
  description: v.nullable(v.string()),
  format: PodcastFormatSchema,
  status: PodcastStatusSchema,
  hostVoice: v.nullable(v.string()),
  hostVoiceName: v.nullable(v.string()),
  coHostVoice: v.nullable(v.string()),
  coHostVoiceName: v.nullable(v.string()),
  promptInstructions: v.nullable(v.string()),
  targetDurationMinutes: v.nullable(v.number()),
  audioUrl: v.nullable(v.string()),
  duration: v.nullable(v.number()),
  errorMessage: v.nullable(v.string()),
  tags: v.array(v.string()),
  publishStatus: PublishStatusSchema,
  publishedAt: v.nullable(v.string()),
  publishedBy: v.nullable(v.string()),
  createdBy: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const PodcastScriptOutputSchema = v.object({
  id: v.string(),
  podcastId: v.string(),
  version: v.number(),
  isActive: v.boolean(),
  segments: v.array(
    v.object({
      speaker: v.string(),
      line: v.string(),
      index: v.number(),
    }),
  ),
  summary: v.nullable(v.string()),
  generationPrompt: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const PodcastFullOutputSchema = v.object({
  ...PodcastOutputSchema.entries,
  documents: v.array(DocumentOutputSchema),
  script: v.nullable(PodcastScriptOutputSchema),
});

// =============================================================================
// Types
// =============================================================================

export type Podcast = typeof podcast.$inferSelect;
export type PodcastScript = typeof podcastScript.$inferSelect;
export type PodcastFormat = Podcast['format'];
export type PodcastStatus = Podcast['status'];
export type PublishStatus = Podcast['publishStatus'];
export type PodcastOutput = v.InferOutput<typeof PodcastOutputSchema>;
export type PodcastScriptOutput = v.InferOutput<typeof PodcastScriptOutputSchema>;
export type PodcastFullOutput = v.InferOutput<typeof PodcastFullOutputSchema>;
export type CreatePodcast = v.InferInput<typeof CreatePodcastSchema>;
export type UpdatePodcast = v.InferInput<typeof UpdatePodcastSchema>;
export type UpdateScript = v.InferInput<typeof UpdateScriptSchema>;

// =============================================================================
// Serializers - co-located with entity
// =============================================================================

/**
 * Serialize a Podcast to API output format.
 */
export const serializePodcast = (podcast: Podcast): PodcastOutput => ({
  id: podcast.id,
  projectId: podcast.projectId,
  title: podcast.title,
  description: podcast.description,
  format: podcast.format,
  status: podcast.status,
  hostVoice: podcast.hostVoice,
  hostVoiceName: podcast.hostVoiceName,
  coHostVoice: podcast.coHostVoice,
  coHostVoiceName: podcast.coHostVoiceName,
  promptInstructions: podcast.promptInstructions,
  targetDurationMinutes: podcast.targetDurationMinutes,
  audioUrl: podcast.audioUrl,
  duration: podcast.duration,
  errorMessage: podcast.errorMessage,
  tags: podcast.tags ?? [],
  publishStatus: podcast.publishStatus,
  publishedAt: podcast.publishedAt?.toISOString() ?? null,
  publishedBy: podcast.publishedBy,
  createdBy: podcast.createdBy,
  createdAt: podcast.createdAt.toISOString(),
  updatedAt: podcast.updatedAt.toISOString(),
});

/**
 * Serialize a PodcastScript to API output format.
 */
export const serializePodcastScript = (script: PodcastScript): PodcastScriptOutput => ({
  id: script.id,
  podcastId: script.podcastId,
  version: script.version,
  isActive: script.isActive,
  segments: script.segments,
  summary: script.summary,
  generationPrompt: script.generationPrompt,
  createdAt: script.createdAt.toISOString(),
  updatedAt: script.updatedAt.toISOString(),
});

/**
 * Serialize a full Podcast with documents and script.
 */
export const serializePodcastFull = (
  podcast: Podcast & { documents: Document[]; script: PodcastScript | null },
): PodcastFullOutput => ({
  ...serializePodcast(podcast),
  documents: podcast.documents.map(serializeDocument),
  script: podcast.script ? serializePodcastScript(podcast.script) : null,
});
