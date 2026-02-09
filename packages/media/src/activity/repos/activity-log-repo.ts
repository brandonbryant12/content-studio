import { Context, Effect, Layer } from 'effect';
import {
  activityLog,
  type ActivityLog,
  type ActivityLogWithUser,
  type ActivityLogId,
  user,
} from '@repo/db/schema';
import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import { desc, eq, and, sql, count as drizzleCount, gt } from 'drizzle-orm';

// =============================================================================
// Input Types
// =============================================================================

export interface InsertActivityLogInput {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityTitle?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListActivityLogOptions {
  userId?: string;
  entityType?: string;
  action?: string;
  limit: number;
  afterCursor?: string;
}

export interface ActivityCountByField {
  field: string;
  count: number;
}

export interface ActivityCountByUser {
  userId: string;
  userName: string;
  count: number;
}

// =============================================================================
// Service Interface
// =============================================================================

export interface ActivityLogRepoService {
  readonly insert: (
    data: InsertActivityLogInput,
  ) => Effect.Effect<ActivityLog, DatabaseError, Db>;

  readonly list: (
    options: ListActivityLogOptions,
  ) => Effect.Effect<readonly ActivityLogWithUser[], DatabaseError, Db>;

  readonly countByEntityType: (
    since: Date,
  ) => Effect.Effect<readonly ActivityCountByField[], DatabaseError, Db>;

  readonly countByAction: (
    since: Date,
  ) => Effect.Effect<readonly ActivityCountByField[], DatabaseError, Db>;

  readonly countByUser: (
    since: Date,
    limit?: number,
  ) => Effect.Effect<readonly ActivityCountByUser[], DatabaseError, Db>;

  readonly countTotal: (
    since: Date,
  ) => Effect.Effect<number, DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class ActivityLogRepo extends Context.Tag('@repo/media/ActivityLogRepo')<
  ActivityLogRepo,
  ActivityLogRepoService
>() {}

// =============================================================================
// Implementation
// =============================================================================

const make: ActivityLogRepoService = {
  insert: (data) =>
    withDb('activityLogRepo.insert', async (db) => {
      const [row] = await db
        .insert(activityLog)
        .values({
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId ?? null,
          entityTitle: data.entityTitle ?? null,
          metadata: data.metadata ?? null,
        })
        .returning();
      return row!;
    }),

  list: (options) =>
    withDb('activityLogRepo.list', async (db) => {
      const conditions = [];

      if (options.userId) {
        conditions.push(eq(activityLog.userId, options.userId));
      }
      if (options.entityType) {
        conditions.push(eq(activityLog.entityType, options.entityType));
      }
      if (options.action) {
        conditions.push(eq(activityLog.action, options.action));
      }
      if (options.afterCursor) {
        conditions.push(sql`${activityLog.createdAt} < ${options.afterCursor}`);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          id: activityLog.id,
          userId: activityLog.userId,
          action: activityLog.action,
          entityType: activityLog.entityType,
          entityId: activityLog.entityId,
          entityTitle: activityLog.entityTitle,
          metadata: activityLog.metadata,
          createdAt: activityLog.createdAt,
          userName: user.name,
        })
        .from(activityLog)
        .innerJoin(user, eq(activityLog.userId, user.id))
        .where(where)
        .orderBy(desc(activityLog.createdAt))
        .limit(options.limit + 1);

      return rows;
    }),

  countByEntityType: (since) =>
    withDb('activityLogRepo.countByEntityType', (db) =>
      db
        .select({
          field: activityLog.entityType,
          count: drizzleCount(),
        })
        .from(activityLog)
        .where(gt(activityLog.createdAt, since))
        .groupBy(activityLog.entityType),
    ),

  countByAction: (since) =>
    withDb('activityLogRepo.countByAction', (db) =>
      db
        .select({
          field: activityLog.action,
          count: drizzleCount(),
        })
        .from(activityLog)
        .where(gt(activityLog.createdAt, since))
        .groupBy(activityLog.action),
    ),

  countByUser: (since, limit = 10) =>
    withDb('activityLogRepo.countByUser', (db) =>
      db
        .select({
          userId: activityLog.userId,
          userName: user.name,
          count: drizzleCount(),
        })
        .from(activityLog)
        .innerJoin(user, eq(activityLog.userId, user.id))
        .where(gt(activityLog.createdAt, since))
        .groupBy(activityLog.userId, user.name)
        .orderBy(desc(drizzleCount()))
        .limit(limit),
    ),

  countTotal: (since) =>
    withDb('activityLogRepo.countTotal', async (db) => {
      const [result] = await db
        .select({ count: drizzleCount() })
        .from(activityLog)
        .where(gt(activityLog.createdAt, since));
      return result?.count ?? 0;
    }),
};

// =============================================================================
// Layer
// =============================================================================

export const ActivityLogRepoLive: Layer.Layer<ActivityLogRepo, never, Db> =
  Layer.succeed(ActivityLogRepo, make);
