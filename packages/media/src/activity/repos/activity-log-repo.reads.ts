import { withDb } from '@repo/db/effect';
import { activityLog, user } from '@repo/db/schema';
import {
  and,
  count as drizzleCount,
  desc,
  eq,
  gt,
  ilike,
  lt,
  or,
} from 'drizzle-orm';
import type { ActivityLogRepoService } from './activity-log-repo';

export const activityLogReadMethods: Pick<
  ActivityLogRepoService,
  'list' | 'countByEntityType' | 'countByAction' | 'countByUser' | 'countTotal'
> = {
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
      if (options.search) {
        const pattern = `%${options.search}%`;
        conditions.push(
          or(
            ilike(user.name, pattern),
            ilike(activityLog.entityTitle, pattern),
          )!,
        );
      }
      if (options.afterCursor) {
        conditions.push(
          lt(activityLog.createdAt, new Date(options.afterCursor)),
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .selectDistinctOn([activityLog.entityId], {
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
        .orderBy(activityLog.entityId, desc(activityLog.createdAt))
        .limit(options.limit + 1);

      rows.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

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
