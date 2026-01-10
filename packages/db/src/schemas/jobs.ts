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

// =============================================================================
// Enum Schemas
// =============================================================================

export const JobStatusSchema = Schema.Union(
  Schema.Literal('pending'),
  Schema.Literal('processing'),
  Schema.Literal('completed'),
  Schema.Literal('failed'),
);

// =============================================================================
// Result Schemas (matches queue result types)
// =============================================================================

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

export const GenerateInfographicResultSchema = Schema.Struct({
  imageUrl: Schema.String,
  infographicId: Schema.String,
});

export const JobResultSchema = Schema.Union(
  GeneratePodcastResultSchema,
  GenerateScriptResultSchema,
  GenerateAudioResultSchema,
  GenerateInfographicResultSchema,
);

// =============================================================================
// Output Schema
// =============================================================================

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

// =============================================================================
// Types
// =============================================================================

export type Job = typeof job.$inferSelect;
export type JobStatus = Job['status'];
export type JobOutput = typeof JobOutputSchema.Type;

// =============================================================================
// Transform Function - pure DB → API output conversion
// =============================================================================

/**
 * Pure transform for Job → JobOutput.
 */
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

// =============================================================================
// Serializers - Effect-based and sync variants
// =============================================================================

/** Effect-based serializer with tracing. */
export const serializeJobEffect = createEffectSerializer('job', jobTransform);

/** Batch serializer for multiple jobs. */
export const serializeJobsEffect = createBatchEffectSerializer(
  'job',
  jobTransform,
);

/** Sync serializer for simple cases. */
export const serializeJob = createSyncSerializer(jobTransform);
