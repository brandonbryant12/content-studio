import {
  pgTable,
  text,
  timestamp,
  varchar,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { Schema } from 'effect';
import { user } from './auth';
import {
  type ActivityLogId,
  ActivityLogIdSchema,
  generateActivityLogId,
} from './brands';
import {
  createEffectSerializer,
  createBatchEffectSerializer,
} from './serialization';

export const activityLog = pgTable(
  'activity_log',
  {
    id: varchar('id', { length: 20 })
      .$type<ActivityLogId>()
      .$default(generateActivityLogId)
      .primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 50 }).notNull(),
    entityType: varchar('entityType', { length: 30 }).notNull(),
    entityId: varchar('entityId', { length: 20 }),
    entityTitle: text('entityTitle'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('activity_log_userId_createdAt_idx').on(
      table.userId,
      table.createdAt,
    ),
    index('activity_log_entityType_createdAt_idx').on(
      table.entityType,
      table.createdAt,
    ),
    index('activity_log_createdAt_idx').on(table.createdAt),
    index('activity_log_entityTitle_idx').on(table.entityTitle),
  ],
);

export const ActivityLogActionSchema = Schema.Union(
  Schema.Literal('created'),
  Schema.Literal('updated'),
  Schema.Literal('deleted'),
  Schema.Literal('generated_script'),
  Schema.Literal('generated_audio'),
  Schema.Literal('generated_voiceover'),
  Schema.Literal('generated_infographic'),
  Schema.Literal('generated_cover_image'),
);

export const ActivityLogEntityTypeSchema = Schema.Union(
  Schema.Literal('document'),
  Schema.Literal('podcast'),
  Schema.Literal('voiceover'),
  Schema.Literal('infographic'),
);

export const ActivityLogOutputSchema = Schema.Struct({
  id: ActivityLogIdSchema,
  userId: Schema.String,
  userName: Schema.NullOr(Schema.String),
  action: Schema.String,
  entityType: Schema.String,
  entityId: Schema.NullOr(Schema.String),
  entityTitle: Schema.NullOr(Schema.String),
  metadata: Schema.NullOr(
    Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  ),
  createdAt: Schema.String,
});

export type ActivityLog = typeof activityLog.$inferSelect;
export type ActivityLogWithUser = ActivityLog & { userName: string | null };
export type ActivityLogOutput = typeof ActivityLogOutputSchema.Type;
export type ActivityLogAction = typeof ActivityLogActionSchema.Type;
export type ActivityLogEntityType = typeof ActivityLogEntityTypeSchema.Type;

const activityLogTransform = (log: ActivityLogWithUser): ActivityLogOutput => ({
  id: log.id,
  userId: log.userId,
  userName: log.userName,
  action: log.action,
  entityType: log.entityType,
  entityId: log.entityId,
  entityTitle: log.entityTitle,
  metadata: log.metadata,
  createdAt: log.createdAt.toISOString(),
});

export const serializeActivityLogEffect = createEffectSerializer(
  'activityLog',
  activityLogTransform,
);

export const serializeActivityLogsEffect = createBatchEffectSerializer(
  'activityLog',
  activityLogTransform,
);

export const serializeActivityLog = activityLogTransform;
