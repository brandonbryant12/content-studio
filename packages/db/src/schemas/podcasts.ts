import { getTableColumns } from 'drizzle-orm';
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
  type PodcastId,
  type SourceId,
  type PersonaId,
  PodcastIdSchema,
  SourceIdSchema,
  PersonaIdSchema,
  generatePodcastId,
} from './brands';
import { persona } from './personas';
import {
  createEffectSerializer,
  createBatchEffectSerializer,
} from './serialization';
import { SourceOutputSchema, serializeSource, type Source } from './sources';

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
  sourceEntries: Array<{
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
  startTimeMs?: number;
  endTimeMs?: number;
}

export interface PodcastEpisodePlanSection {
  heading: string;
  summary: string;
  keyPoints: readonly string[];
  sourceIds: readonly string[];
  estimatedMinutes?: number;
}

export interface PodcastEpisodePlan {
  angle: string;
  openingHook: string;
  closingTakeaway: string;
  sections: readonly PodcastEpisodePlanSection[];
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
    setupInstructions: text('setupInstructions'),
    promptInstructions: text('promptInstructions'),
    episodePlan: jsonb('episodePlan').$type<PodcastEpisodePlan>(),
    targetDurationMinutes: integer('targetDurationMinutes').default(5),
    tags: jsonb('tags').$type<string[]>().default([]),
    sourceIds: varchar('sourceIds', { length: 20 })
      .array()
      .$type<SourceId[]>()
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
    hostPersonaId: varchar('hostPersonaId', { length: 20 })
      .$type<PersonaId>()
      .references(() => persona.id, { onDelete: 'set null' }),
    coHostPersonaId: varchar('coHostPersonaId', { length: 20 })
      .$type<PersonaId>()
      .references(() => persona.id, { onDelete: 'set null' }),
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

export const PodcastFormatSchema = Schema.Literal(
  ...podcastFormatEnum.enumValues,
);

export const VersionStatusSchema = Schema.Literal(
  ...versionStatusEnum.enumValues,
);

export const CreatePodcastSchema = Schema.Struct({
  title: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  ),
  description: Schema.optional(Schema.String),
  format: PodcastFormatSchema,
  sourceIds: Schema.optional(Schema.Array(SourceIdSchema)),
  setupInstructions: Schema.optional(
    Schema.String.pipe(Schema.maxLength(1000)),
  ),
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
  hostPersonaId: Schema.optional(Schema.NullOr(PersonaIdSchema)),
  coHostPersonaId: Schema.optional(Schema.NullOr(PersonaIdSchema)),
});

export const PodcastEpisodePlanSectionSchema = Schema.Struct({
  heading: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
  summary: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(1000)),
  keyPoints: Schema.Array(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(240)),
  ),
  sourceIds: Schema.Array(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(20)),
  ),
  estimatedMinutes: Schema.optional(
    Schema.Number.pipe(
      Schema.greaterThanOrEqualTo(1),
      Schema.lessThanOrEqualTo(60),
    ),
  ),
});

export const PodcastEpisodePlanSchema = Schema.Struct({
  angle: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
  openingHook: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(400)),
  closingTakeaway: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(400),
  ),
  sections: Schema.Array(PodcastEpisodePlanSectionSchema),
});

export const UpdatePodcastFields = {
  title: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  ),
  description: Schema.optional(Schema.String),
  setupInstructions: Schema.optional(
    Schema.NullOr(Schema.String.pipe(Schema.maxLength(1000))),
  ),
  promptInstructions: Schema.optional(Schema.String),
  episodePlan: Schema.optional(Schema.NullOr(PodcastEpisodePlanSchema)),
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
  sourceIds: Schema.optional(Schema.Array(SourceIdSchema)),
  coverImageStorageKey: Schema.optional(Schema.NullOr(Schema.String)),
  hostPersonaId: Schema.optional(Schema.NullOr(PersonaIdSchema)),
  coHostPersonaId: Schema.optional(Schema.NullOr(PersonaIdSchema)),
};

export const UpdatePodcastSchema = Schema.Struct(UpdatePodcastFields);

export const ScriptSegmentSchema = Schema.Struct({
  speaker: Schema.String,
  line: Schema.String,
  index: Schema.Number,
  startTimeMs: Schema.optional(
    Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)),
  ),
  endTimeMs: Schema.optional(
    Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)),
  ),
});

export const UpdateScriptSchema = Schema.Struct({
  segments: Schema.Array(ScriptSegmentSchema),
});

export const GenerationContextOutputSchema = Schema.Struct({
  systemPromptTemplate: Schema.String,
  userInstructions: Schema.String,
  sourceEntries: Schema.Array(
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

export const PodcastOutputSchema = Schema.Struct({
  id: PodcastIdSchema,
  title: Schema.String,
  description: Schema.NullOr(Schema.String),
  format: PodcastFormatSchema,
  hostVoice: Schema.NullOr(Schema.String),
  hostVoiceName: Schema.NullOr(Schema.String),
  coHostVoice: Schema.NullOr(Schema.String),
  coHostVoiceName: Schema.NullOr(Schema.String),
  setupInstructions: Schema.NullOr(Schema.String),
  promptInstructions: Schema.NullOr(Schema.String),
  episodePlan: Schema.NullOr(PodcastEpisodePlanSchema),
  targetDurationMinutes: Schema.NullOr(Schema.Number),
  tags: Schema.Array(Schema.String),
  sourceIds: Schema.Array(SourceIdSchema),
  generationContext: Schema.NullOr(GenerationContextOutputSchema),
  status: VersionStatusSchema,
  segments: Schema.NullOr(Schema.Array(ScriptSegmentSchema)),
  summary: Schema.NullOr(Schema.String),
  generationPrompt: Schema.NullOr(Schema.String),
  audioUrl: Schema.NullOr(Schema.String),
  duration: Schema.NullOr(Schema.Number),
  errorMessage: Schema.NullOr(Schema.String),
  hostPersonaId: Schema.NullOr(PersonaIdSchema),
  coHostPersonaId: Schema.NullOr(PersonaIdSchema),
  coverImageStorageKey: Schema.NullOr(Schema.String),
  approvedBy: Schema.NullOr(Schema.String),
  approvedAt: Schema.NullOr(Schema.String),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const PodcastFullOutputSchema = Schema.Struct({
  ...PodcastOutputSchema.fields,
  sources: Schema.Array(SourceOutputSchema),
});

/**
 * Columns for list queries — omits heavy JSONB/text fields not needed in list views.
 */
const {
  segments: _segments,
  generationContext: _generationContext,
  generationPrompt: _generationPrompt,
  summary: _summary,
  episodePlan: _episodePlan,
  setupInstructions: _setupInstructions,
  ...podcastListColumns
} = getTableColumns(podcast);

export { podcastListColumns };

/**
 * Lean list-item type returned by the repo `list` method.
 */
export type PodcastListItem = Omit<
  Podcast,
  | 'segments'
  | 'generationContext'
  | 'generationPrompt'
  | 'summary'
  | 'episodePlan'
  | 'setupInstructions'
>;

export const PodcastListItemOutputSchema = Schema.Struct({
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
  sourceIds: Schema.Array(SourceIdSchema),
  status: VersionStatusSchema,
  audioUrl: Schema.NullOr(Schema.String),
  duration: Schema.NullOr(Schema.Number),
  errorMessage: Schema.NullOr(Schema.String),
  hostPersonaId: Schema.NullOr(PersonaIdSchema),
  coHostPersonaId: Schema.NullOr(PersonaIdSchema),
  coverImageStorageKey: Schema.NullOr(Schema.String),
  approvedBy: Schema.NullOr(Schema.String),
  approvedAt: Schema.NullOr(Schema.String),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export type Podcast = typeof podcast.$inferSelect;
export type PodcastFormat = Podcast['format'];
export type VersionStatus = Podcast['status'];
export type GenerationContextOutput = typeof GenerationContextOutputSchema.Type;
export type PodcastOutput = typeof PodcastOutputSchema.Type;
export type PodcastFullOutput = typeof PodcastFullOutputSchema.Type;
export type PodcastListItemOutput = typeof PodcastListItemOutputSchema.Type;

const trimToUndefined = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

const trimToNull = (value: string | null | undefined) =>
  trimToUndefined(value) ?? null;

const normalizePodcastEpisodePlanSection = (
  section: PodcastEpisodePlanSection,
): PodcastEpisodePlanSection | null => {
  const heading = trimToUndefined(section.heading);
  const summary = trimToUndefined(section.summary);

  if (!heading || !summary) {
    return null;
  }

  const keyPoints = Array.from(
    new Set(
      section.keyPoints
        .map((value) => trimToUndefined(value))
        .filter((value): value is string => value !== undefined),
    ),
  );

  const sourceIds = Array.from(
    new Set(
      section.sourceIds
        .map((value) => trimToUndefined(value))
        .filter((value): value is string => value !== undefined),
    ),
  );

  const estimatedMinutes =
    typeof section.estimatedMinutes === 'number' &&
    Number.isFinite(section.estimatedMinutes) &&
    section.estimatedMinutes > 0
      ? Math.round(section.estimatedMinutes)
      : undefined;

  return {
    heading,
    summary,
    keyPoints,
    sourceIds,
    estimatedMinutes,
  };
};

const normalizePodcastEpisodePlan = (
  plan: PodcastEpisodePlan | null | undefined,
): PodcastEpisodePlan | null => {
  if (!plan) {
    return null;
  }

  const angle = trimToUndefined(plan.angle);
  const openingHook = trimToUndefined(plan.openingHook);
  const closingTakeaway = trimToUndefined(plan.closingTakeaway);
  const sections = plan.sections
    .map((section) => normalizePodcastEpisodePlanSection(section))
    .filter(
      (section): section is PodcastEpisodePlanSection => section !== null,
    );

  if (!angle || !openingHook || !closingTakeaway || sections.length === 0) {
    return null;
  }

  return {
    angle,
    openingHook,
    closingTakeaway,
    sections,
  };
};

const podcastListItemTransform = (
  p: PodcastListItem,
): PodcastListItemOutput => ({
  id: p.id,
  title: p.title,
  description: p.description,
  format: p.format,
  hostVoice: p.hostVoice,
  hostVoiceName: p.hostVoiceName,
  coHostVoice: p.coHostVoice,
  coHostVoiceName: p.coHostVoiceName,
  promptInstructions: p.promptInstructions,
  targetDurationMinutes: p.targetDurationMinutes,
  tags: p.tags ?? [],
  sourceIds: p.sourceIds ?? [],
  status: p.status,
  audioUrl: p.audioUrl ?? null,
  duration: p.duration ?? null,
  errorMessage: p.errorMessage ?? null,
  hostPersonaId: p.hostPersonaId ?? null,
  coHostPersonaId: p.coHostPersonaId ?? null,
  coverImageStorageKey: p.coverImageStorageKey ?? null,
  approvedBy: p.approvedBy ?? null,
  approvedAt: p.approvedAt?.toISOString() ?? null,
  createdBy: p.createdBy,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});
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
  setupInstructions: trimToNull(podcast.setupInstructions),
  promptInstructions: podcast.promptInstructions,
  episodePlan: normalizePodcastEpisodePlan(podcast.episodePlan),
  targetDurationMinutes: podcast.targetDurationMinutes,
  tags: podcast.tags ?? [],
  sourceIds: podcast.sourceIds ?? [],
  generationContext: podcast.generationContext ?? null,
  status: podcast.status,
  segments: podcast.segments ?? null,
  summary: podcast.summary ?? null,
  generationPrompt: podcast.generationPrompt ?? null,
  audioUrl: podcast.audioUrl ?? null,
  duration: podcast.duration ?? null,
  errorMessage: podcast.errorMessage ?? null,
  hostPersonaId: podcast.hostPersonaId ?? null,
  coHostPersonaId: podcast.coHostPersonaId ?? null,
  coverImageStorageKey: podcast.coverImageStorageKey ?? null,
  approvedBy: podcast.approvedBy ?? null,
  approvedAt: podcast.approvedAt?.toISOString() ?? null,
  createdBy: podcast.createdBy,
  createdAt: podcast.createdAt.toISOString(),
  updatedAt: podcast.updatedAt.toISOString(),
});

type PodcastWithSources = Podcast & {
  sources: Source[];
};

const podcastFullTransform = (
  podcast: PodcastWithSources,
): PodcastFullOutput => ({
  ...podcastTransform(podcast),
  sources: podcast.sources.map(serializeSource),
});

export const serializePodcastEffect = createEffectSerializer(
  'podcast',
  podcastTransform,
);

export const serializePodcastsEffect = createBatchEffectSerializer(
  'podcast',
  podcastTransform,
);

export const serializePodcast = podcastTransform;

export const serializePodcastFullEffect = createEffectSerializer(
  'podcastFull',
  podcastFullTransform,
);

export const serializePodcastFull = podcastFullTransform;

export const serializePodcastListItemEffect = createEffectSerializer(
  'podcastListItem',
  podcastListItemTransform,
);

export const serializePodcastListItemsEffect = createBatchEffectSerializer(
  'podcastListItem',
  podcastListItemTransform,
);

export const serializePodcastListItem = podcastListItemTransform;
