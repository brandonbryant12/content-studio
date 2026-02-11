import { oc } from '@orpc/contract';
import { ActivityLogOutputSchema } from '@repo/db/schema';
import { Schema } from 'effect';

const std = Schema.standardSchemaV1;

const CoerceNumber = Schema.Union(
  Schema.Number,
  Schema.String.pipe(
    Schema.transform(Schema.Number, { decode: Number, encode: String }),
  ),
).pipe(Schema.compose(Schema.Number));

const ActivityStatsOutputSchema = Schema.Struct({
  total: Schema.Number,
  byEntityType: Schema.Array(
    Schema.Struct({ field: Schema.String, count: Schema.Number }),
  ),
  byAction: Schema.Array(
    Schema.Struct({ field: Schema.String, count: Schema.Number }),
  ),
  topUsers: Schema.Array(
    Schema.Struct({
      userId: Schema.String,
      userName: Schema.String,
      count: Schema.Number,
    }),
  ),
});

const PaginatedActivityLogSchema = Schema.Struct({
  data: Schema.Array(ActivityLogOutputSchema),
  hasMore: Schema.Boolean,
  nextCursor: Schema.optional(Schema.String),
});

const activityContract = oc
  .prefix('/admin/activity')
  .tag('admin')
  .router({
    list: oc
      .route({
        method: 'GET',
        path: '/',
        summary: 'List activity log',
        description: 'Retrieve paginated activity log entries (admin only)',
      })
      .input(
        std(
          Schema.Struct({
            userId: Schema.optional(Schema.String),
            entityType: Schema.optional(Schema.String),
            action: Schema.optional(Schema.String),
            search: Schema.optional(Schema.String),
            limit: Schema.optional(
              CoerceNumber.pipe(
                Schema.greaterThanOrEqualTo(1),
                Schema.lessThanOrEqualTo(100),
              ),
            ),
            afterCursor: Schema.optional(Schema.String),
          }),
        ),
      )
      .output(std(PaginatedActivityLogSchema)),

    stats: oc
      .route({
        method: 'GET',
        path: '/stats',
        summary: 'Get activity stats',
        description: 'Retrieve activity statistics summary (admin only)',
      })
      .input(
        std(
          Schema.Struct({
            period: Schema.optionalWith(
              Schema.Union(
                Schema.Literal('24h'),
                Schema.Literal('7d'),
                Schema.Literal('30d'),
              ),
              { default: () => '7d' as const },
            ),
          }),
        ),
      )
      .output(std(ActivityStatsOutputSchema)),
  });

export default activityContract;
