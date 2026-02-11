import {
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
  jsonb,
  index,
  pgEnum,
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
  PodcastIdSchema,
  DocumentIdSchema,
  generatePodcastId,
} from './brands';

export const podcastFormatEnum = pgEnum('podcast_format', [
  'voice_over',
  'conversation',
]);

/** Flow: drafting -> generating_script -> script_ready -> generating_audio -> ready */
export const versionStatusEnum = pgEnum('version_status', [
  'drafting',
  'generating_script',
  'script_ready',
  'generating_audio',
  'ready',
  'failed',
]);

export const VersionStatus = {
  DRAFTING: 'drafting',
  GENERATING_SCRIPT: 'generating_script',
  SCRIPT_READY: 'script_ready',
  GENERATING_AUDIO: 'generating_audio',
  READY: 'ready',
  FAILED: 'failed',
} as const;

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
    hostVoice: text('hostVoice'),
    hostVoiceName: text('hostVoiceName'),
    coHostVoice: text('coHostVoice'),
    coHostVoiceName: text('coHostVoiceName'),
    promptInstructions: text('promptInstructions'),
    targetDurationMinutes: integer('targetDurationMinutes').default(5),
    tags: jsonb('tags').$type<string[]>().default([]),
    sourceDocumentIds: varchar('sourceDocumentIds', { length: 20 })
      .array()
      .$type<DocumentId[]>()
      .notNull()
      .default([]),
    generationContext: jsonb('generationContext').$type<GenerationContext>(),
    status: versionStatusEnum('status').notNull().default('drafting'),
    segments: jsonb('segments').$type<ScriptSegment[]>(),
    summary: text('summary'),
    generationPrompt: text('generationPrompt'),
    audioUrl: text('audioUrl'),
    duration: integer('duration'),
    errorMessage: text('errorMessage'),
    coverImageStorageKey: text('coverImageStorageKey'),
    approvedBy: text('approvedBy').references(() => user.id),
    approvedAt: timestamp('approvedAt', { mode: 'date', withTimezone: true }),
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

export const PodcastFormat = {
  VOICE_OVER: 'voice_over',
  CONVERSATION: 'conversation',
} as const;

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
  coverImageStorageKey: Schema.optional(Schema.NullOr(Schema.String)),
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

export const PodcastFormatSchema = Schema.Union(
  Schema.Literal('voice_over'),
  Schema.Literal('conversation'),
);

export const VersionStatusSchema = Schema.Union(
  Schema.Literal('drafting'),
  Schema.Literal('generating_script'),
  Schema.Literal('script_ready'),
  Schema.Literal('generating_audio'),
  Schema.Literal('ready'),
  Schema.Literal('failed'),
);

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
  hostVoice: Schema.NullOr(Schema.String),
  hostVoiceName: Schema.NullOr(Schema.String),
  coHostVoice: Schema.NullOr(Schema.String),
  coHostVoiceName: Schema.NullOr(Schema.String),
  promptInstructions: Schema.NullOr(Schema.String),
  targetDurationMinutes: Schema.NullOr(Schema.Number),
  tags: Schema.Array(Schema.String),
  sourceDocumentIds: Schema.Array(DocumentIdSchema),
  generationContext: Schema.NullOr(GenerationContextOutputSchema),
  status: VersionStatusSchema,
  segments: Schema.NullOr(Schema.Array(ScriptSegmentSchema)),
  summary: Schema.NullOr(Schema.String),
  generationPrompt: Schema.NullOr(Schema.String),
  audioUrl: Schema.NullOr(Schema.String),
  duration: Schema.NullOr(Schema.Number),
  errorMessage: Schema.NullOr(Schema.String),
  coverImageStorageKey: Schema.NullOr(Schema.String),
  approvedBy: Schema.NullOr(Schema.String),
  approvedAt: Schema.NullOr(Schema.String),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const PodcastFullOutputSchema = Schema.Struct({
  ...PodcastOutputSchema.fields,
  documents: Schema.Array(DocumentOutputSchema),
});

export const PodcastListItemOutputSchema = Schema.Struct({
  ...PodcastOutputSchema.fields,
});

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
  status: podcast.status,
  segments: podcast.segments ?? null,
  summary: podcast.summary ?? null,
  generationPrompt: podcast.generationPrompt ?? null,
  audioUrl: podcast.audioUrl ?? null,
  duration: podcast.duration ?? null,
  errorMessage: podcast.errorMessage ?? null,
  coverImageStorageKey: podcast.coverImageStorageKey ?? null,
  approvedBy: podcast.approvedBy ?? null,
  approvedAt: podcast.approvedAt?.toISOString() ?? null,
  createdBy: podcast.createdBy,
  createdAt: podcast.createdAt.toISOString(),
  updatedAt: podcast.updatedAt.toISOString(),
});

type PodcastWithDocuments = Podcast & {
  documents: Document[];
};

const podcastFullTransform = (
  podcast: PodcastWithDocuments,
): PodcastFullOutput => ({
  ...podcastTransform(podcast),
  documents: podcast.documents.map(serializeDocument),
});

const podcastListItemTransform = (podcast: Podcast): PodcastListItemOutput => ({
  ...podcastTransform(podcast),
});

export const serializePodcastEffect = createEffectSerializer(
  'podcast',
  podcastTransform,
);

export const serializePodcastsEffect = createBatchEffectSerializer(
  'podcast',
  podcastTransform,
);

export const serializePodcast = createSyncSerializer(podcastTransform);

export const serializePodcastFullEffect = createEffectSerializer(
  'podcastFull',
  podcastFullTransform,
);

export const serializePodcastFull = createSyncSerializer(podcastFullTransform);

export const serializePodcastListItemEffect = createEffectSerializer(
  'podcastListItem',
  podcastListItemTransform,
);

export const serializePodcastListItemsEffect = createBatchEffectSerializer(
  'podcastListItem',
  podcastListItemTransform,
);

export const serializePodcastListItem = createSyncSerializer(
  podcastListItemTransform,
);
