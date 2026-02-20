import { withDb } from '@repo/db/effect';
import { activityLog } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { ActivityLogRepoService } from './activity-log-repo';

export const activityLogWriteMethods: Pick<
  ActivityLogRepoService,
  'insert' | 'updateEntityTitle'
> = {
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

      if (data.entityId && data.entityTitle) {
        await db
          .update(activityLog)
          .set({ entityTitle: data.entityTitle })
          .where(eq(activityLog.entityId, data.entityId));
      }

      return row!;
    }),

  updateEntityTitle: (entityId, title) =>
    withDb('activityLogRepo.updateEntityTitle', async (db) => {
      await db
        .update(activityLog)
        .set({ entityTitle: title })
        .where(eq(activityLog.entityId, entityId));
    }),
};
