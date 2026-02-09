import {
  serializeActivityLogsEffect,
  type ActivityLogWithUser,
} from '@repo/db/schema';
import { listActivity, getActivityStats } from '@repo/media';
import { Effect } from 'effect';
import { handleEffectWithProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';

const activityRouter = {
  list: protectedProcedure.admin.list.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listActivity(input).pipe(
          Effect.flatMap((result) =>
            serializeActivityLogsEffect(
              result.data as readonly ActivityLogWithUser[],
            ).pipe(
              Effect.map((data) => ({
                data,
                hasMore: result.hasMore,
                nextCursor: result.nextCursor,
              })),
            ),
          ),
        ),
        errors,
        {
          span: 'api.admin.activity.list',
          attributes: { 'pagination.limit': input.limit ?? 25 },
        },
      );
    },
  ),

  stats: protectedProcedure.admin.stats.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getActivityStats({ period: input.period }),
        errors,
        {
          span: 'api.admin.activity.stats',
          attributes: { 'activity.period': input.period },
        },
      );
    },
  ),
};

export default activityRouter;
