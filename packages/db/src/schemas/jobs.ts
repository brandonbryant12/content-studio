import {
  pgTable,
  text,
  timestamp,
  varchar,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { Schema } from 'effect';
import { user } from './auth';
import { type JobId, JobIdSchema, generateJobId } from './brands';
import {
  createEffectSerializer,
  createBatchEffectSerializer,
  createSyncSerializer,
} from './serialization';

export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

export const job = pgTable(
  'job',
  {
    id: varchar('id', { length: 20 })
      .$type<JobId>()
      .$default(generateJobId)
      .primaryKey(),
    type: text('type').notNull(),
    status: jobStatusEnum('status').notNull().default('pending'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    result: jsonb('result').$type<Record<string, unknown>>(),
    error: text('error'),
    createdBy: text('createdBy')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updatedAt', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp('startedAt', { mode: 'date', withTimezone: true }),
    completedAt: timestamp('completedAt', {
      mode: 'date',
      withTimezone: true,
    }),
  },
  (table) => [
    index('job_createdBy_idx').on(table.createdBy),
    index('job_status_idx').on(table.status),
    index('job_type_status_idx').on(table.type, table.status),
  ],
);

export const JobStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const JobType = {
  GENERATE_PODCAST: 'generate-podcast',
  GENERATE_SCRIPT: 'generate-script',
  GENERATE_AUDIO: 'generate-audio',
  GENERATE_VOICEOVER: 'generate-voiceover',
  GENERATE_INFOGRAPHIC: 'generate-infographic',
  PROCESS_URL: 'process-url',
  PROCESS_RESEARCH: 'process-research',
} as const;

export type JobType = typeof JobType;

export const JobStatusSchema = Schema.Literal(
  'pending',
  'processing',
  'completed',
  'failed',
);

export const GeneratePodcastResultSchema = Schema.Struct({
  scriptId: Schema.String,
  segmentCount: Schema.Number,
  audioUrl: Schema.String,
  duration: Schema.Number,
});

export const GenerateScriptResultSchema = Schema.Struct({
  scriptId: Schema.String,
  segmentCount: Schema.Number,
});

export const GenerateAudioResultSchema = Schema.Struct({
  audioUrl: Schema.String,
  duration: Schema.Number,
});

export const JobResultSchema = Schema.Union(
  GeneratePodcastResultSchema,
  GenerateScriptResultSchema,
  GenerateAudioResultSchema,
);

export const JobOutputSchema = Schema.Struct({
  id: JobIdSchema,
  type: Schema.String,
  status: JobStatusSchema,
  result: Schema.NullOr(JobResultSchema),
  error: Schema.NullOr(Schema.String),
  createdBy: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  startedAt: Schema.NullOr(Schema.String),
  completedAt: Schema.NullOr(Schema.String),
});

export type Job = typeof job.$inferSelect;
export type JobStatus = Job['status'];
export type JobOutput = typeof JobOutputSchema.Type;

const jobTransform = (job: Job): JobOutput => ({
  id: job.id,
  type: job.type,
  status: job.status,
  result: job.result as JobOutput['result'],
  error: job.error,
  createdBy: job.createdBy,
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
  startedAt: job.startedAt?.toISOString() ?? null,
  completedAt: job.completedAt?.toISOString() ?? null,
});

export const serializeJobEffect = createEffectSerializer('job', jobTransform);

export const serializeJobsEffect = createBatchEffectSerializer(
  'job',
  jobTransform,
);

export const serializeJob = createSyncSerializer(jobTransform);
