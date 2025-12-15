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
import { project } from './projects';
import { type GenerationContext } from './media-source';

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
    /** Generation context storing prompts and source references */
    generationContext: jsonb('generation_context').$type<GenerationContext>(),
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

export type Podcast = typeof podcast.$inferSelect;
export type PodcastScript = typeof podcastScript.$inferSelect;
export type PodcastFormat = Podcast['format'];
export type PodcastStatus = Podcast['status'];
export type CreatePodcast = v.InferInput<typeof CreatePodcastSchema>;
export type UpdatePodcast = v.InferInput<typeof UpdatePodcastSchema>;
export type UpdateScript = v.InferInput<typeof UpdateScriptSchema>;
