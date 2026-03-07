import { serializeActivityLogsEffect } from '@repo/db/schema';
import { listActivity, getActivityStats } from '@repo/media';
import { Effect } from 'effect';
import { bindEffectProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';

const activityRouter = {
  list: protectedProcedure.admin.activity.list.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        listActivity(input).pipe(
          Effect.flatMap((result) =>
            serializeActivityLogsEffect(result.data).pipe(
              Effect.map((data) => ({
                data,
                hasMore: result.hasMore,
                nextCursor: result.nextCursor,
              })),
            ),
          ),
        ),
        {
          attributes: { 'pagination.limit': input.limit ?? 25 },
        },
      ),
  ),

  stats: protectedProcedure.admin.activity.stats.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        getActivityStats({ period: input.period }),
        {
          attributes: { 'activity.period': input.period },
        },
      ),
  ),
};

export default activityRouter;
