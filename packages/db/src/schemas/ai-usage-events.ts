import {
  pgTable,
  text,
  timestamp,
  varchar,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { Schema } from 'effect';
import { user } from './auth';
import {
  type AIUsageEventId,
  AIUsageEventIdSchema,
  generateAIUsageEventId,
} from './brands';
import { MetadataSchema, type JsonValue } from './json';
import {
  createBatchEffectSerializer,
  createEffectSerializer,
} from './serialization';

export const AIUsageEventModalitySchema = Schema.Union(
  Schema.Literal('llm'),
  Schema.Literal('tts'),
  Schema.Literal('image_generation'),
  Schema.Literal('deep_research'),
);

export const AIUsageEventStatusSchema = Schema.Union(
  Schema.Literal('succeeded'),
  Schema.Literal('failed'),
  Schema.Literal('aborted'),
);

export const aiUsageEvent = pgTable(
  'ai_usage_event',
  {
    id: varchar('id', { length: 20 })
      .$type<AIUsageEventId>()
      .$default(generateAIUsageEventId)
      .primaryKey(),
    userId: text('userId').references(() => user.id, { onDelete: 'set null' }),
    requestId: text('requestId'),
    jobId: varchar('jobId', { length: 20 }),
    scopeOperation: text('scopeOperation'),
    resourceType: varchar('resourceType', { length: 50 }),
    resourceId: varchar('resourceId', { length: 20 }),
    modality: varchar('modality', { length: 30 }).notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    providerOperation: varchar('providerOperation', { length: 50 }).notNull(),
    model: text('model'),
    status: varchar('status', { length: 20 }).notNull(),
    errorTag: varchar('errorTag', { length: 100 }),
    usage: jsonb('usage')
      .$type<Record<string, JsonValue>>()
      .notNull()
      .default({}),
    metadata: jsonb('metadata').$type<Record<string, JsonValue>>(),
    rawUsage: jsonb('rawUsage').$type<Record<string, JsonValue>>(),
    estimatedCostUsdMicros: integer('estimatedCostUsdMicros'),
    providerResponseId: text('providerResponseId'),
    createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('ai_usage_event_userId_createdAt_idx').on(
      table.userId,
      table.createdAt,
    ),
    index('ai_usage_event_requestId_createdAt_idx').on(
      table.requestId,
      table.createdAt,
    ),
    index('ai_usage_event_jobId_createdAt_idx').on(
      table.jobId,
      table.createdAt,
    ),
    index('ai_usage_event_modality_createdAt_idx').on(
      table.modality,
      table.createdAt,
    ),
    index('ai_usage_event_provider_createdAt_idx').on(
      table.provider,
      table.createdAt,
    ),
    index('ai_usage_event_resourceType_resourceId_createdAt_idx').on(
      table.resourceType,
      table.resourceId,
      table.createdAt,
    ),
  ],
);

export const AIUsageEventOutputSchema = Schema.Struct({
  id: AIUsageEventIdSchema,
  userId: Schema.NullOr(Schema.String),
  requestId: Schema.NullOr(Schema.String),
  jobId: Schema.NullOr(Schema.String),
  scopeOperation: Schema.NullOr(Schema.String),
  resourceType: Schema.NullOr(Schema.String),
  resourceId: Schema.NullOr(Schema.String),
  modality: AIUsageEventModalitySchema,
  provider: Schema.String,
  providerOperation: Schema.String,
  model: Schema.NullOr(Schema.String),
  status: AIUsageEventStatusSchema,
  errorTag: Schema.NullOr(Schema.String),
  usage: MetadataSchema,
  metadata: Schema.NullOr(MetadataSchema),
  rawUsage: Schema.NullOr(MetadataSchema),
  estimatedCostUsdMicros: Schema.NullOr(Schema.Number),
  providerResponseId: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
});

export type AIUsageEvent = typeof aiUsageEvent.$inferSelect;
export type AIUsageEventInsert = typeof aiUsageEvent.$inferInsert;
export type AIUsageEventOutput = typeof AIUsageEventOutputSchema.Type;
export type AIUsageEventModality = typeof AIUsageEventModalitySchema.Type;
export type AIUsageEventStatus = typeof AIUsageEventStatusSchema.Type;

const aiUsageEventTransform = (event: AIUsageEvent): AIUsageEventOutput => ({
  id: event.id,
  userId: event.userId,
  requestId: event.requestId,
  jobId: event.jobId,
  scopeOperation: event.scopeOperation,
  resourceType: event.resourceType,
  resourceId: event.resourceId,
  modality: event.modality as AIUsageEventModality,
  provider: event.provider,
  providerOperation: event.providerOperation,
  model: event.model,
  status: event.status as AIUsageEventStatus,
  errorTag: event.errorTag,
  usage: event.usage ?? {},
  metadata: event.metadata ?? null,
  rawUsage: event.rawUsage ?? null,
  estimatedCostUsdMicros: event.estimatedCostUsdMicros,
  providerResponseId: event.providerResponseId,
  createdAt: event.createdAt.toISOString(),
});

export const serializeAIUsageEventEffect = createEffectSerializer(
  'aiUsageEvent',
  aiUsageEventTransform,
);

export const serializeAIUsageEventsEffect = createBatchEffectSerializer(
  'aiUsageEvent',
  aiUsageEventTransform,
);

export const serializeAIUsageEvent = aiUsageEventTransform;
