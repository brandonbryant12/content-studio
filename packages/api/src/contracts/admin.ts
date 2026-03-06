import { oc } from '@orpc/contract';
import {
  AIUsageEventOutputSchema,
  InfographicOutputSchema,
  PersonaOutputSchema,
  PodcastListItemOutputSchema,
  SourceListItemOutputSchema,
  UserOutputSchema,
  VoiceoverListItemOutputSchema,
} from '@repo/db/schema';
import { Schema } from 'effect';
import activityContract from './activity';
import { std, CoerceNumber, PaginationFields } from './shared';

const AIUsagePeriodSchema = Schema.Union(
  Schema.Literal('7d'),
  Schema.Literal('30d'),
  Schema.Literal('90d'),
  Schema.Literal('all'),
);

const AIUsageByModalityOutputSchema = Schema.Struct({
  modality: Schema.String,
  count: Schema.Number,
  estimatedCostUsdMicros: Schema.Number,
  pricedEventCount: Schema.Number,
});

const AIUsageByProviderOutputSchema = Schema.Struct({
  provider: Schema.String,
  count: Schema.Number,
  estimatedCostUsdMicros: Schema.Number,
  pricedEventCount: Schema.Number,
});

const AIUsageTimelinePointOutputSchema = Schema.Struct({
  day: Schema.String,
  count: Schema.Number,
  estimatedCostUsdMicros: Schema.Number,
  pricedEventCount: Schema.Number,
});

const UserEntityCountsOutputSchema = Schema.Struct({
  sources: Schema.Number,
  podcasts: Schema.Number,
  voiceovers: Schema.Number,
  personas: Schema.Number,
  infographics: Schema.Number,
});

const AdminUserEntityTypeSchema = Schema.Literal(
  'source',
  'podcast',
  'voiceover',
  'persona',
  'infographic',
);

const AdminUserEntityOutputSchema = Schema.Struct({
  entityType: AdminUserEntityTypeSchema,
  entityId: Schema.String,
  title: Schema.String,
  subtitle: Schema.NullOr(Schema.String),
  status: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

const AdminUserEntityListOutputSchema = Schema.Struct({
  entities: Schema.Array(AdminUserEntityOutputSchema),
  total: Schema.Number,
  hasMore: Schema.Boolean,
});

const AdminUserDetailOutputSchema = Schema.Struct({
  user: UserOutputSchema,
  entityCounts: UserEntityCountsOutputSchema,
  recentEntities: Schema.Struct({
    sources: Schema.Array(SourceListItemOutputSchema),
    podcasts: Schema.Array(PodcastListItemOutputSchema),
    voiceovers: Schema.Array(VoiceoverListItemOutputSchema),
    personas: Schema.Array(PersonaOutputSchema),
    infographics: Schema.Array(InfographicOutputSchema),
  }),
  aiUsageSummary: Schema.Struct({
    totalEvents: Schema.Number,
    totalEstimatedCostUsdMicros: Schema.Number,
    pricedEventCount: Schema.Number,
    byModality: Schema.Array(AIUsageByModalityOutputSchema),
    byProvider: Schema.Array(AIUsageByProviderOutputSchema),
    timeline: Schema.Array(AIUsageTimelinePointOutputSchema),
  }),
  aiUsageEvents: Schema.Array(AIUsageEventOutputSchema),
});

const usersContract = oc.prefix('/users').router({
  search: oc
    .route({
      method: 'GET',
      path: '/',
      summary: 'Search users',
      description: 'Search users by name or email. Admin-only.',
    })
    .input(
      std(
        Schema.Struct({
          query: Schema.optional(Schema.String),
          limit: Schema.optional(
            CoerceNumber.pipe(
              Schema.greaterThanOrEqualTo(1),
              Schema.lessThanOrEqualTo(50),
            ),
          ),
        }),
      ),
    )
    .output(std(Schema.Array(UserOutputSchema))),

  entities: oc
    .route({
      method: 'GET',
      path: '/{userId}/entities',
      summary: 'List admin user entities',
      description:
        'List a user’s entities with search, type filtering, and pagination. Admin-only.',
    })
    .errors({
      USER_NOT_FOUND: {
        status: 404,
        data: std(Schema.Struct({ userId: Schema.String })),
      },
    })
    .input(
      std(
        Schema.Struct({
          userId: Schema.String,
          query: Schema.optional(Schema.String),
          entityType: Schema.optional(AdminUserEntityTypeSchema),
          ...PaginationFields,
        }),
      ),
    )
    .output(std(AdminUserEntityListOutputSchema)),

  get: oc
    .route({
      method: 'GET',
      path: '/{userId}',
      summary: 'Get admin user detail',
      description:
        'Retrieve a user profile with recent entities and AI usage. Admin-only.',
    })
    .errors({
      USER_NOT_FOUND: {
        status: 404,
        data: std(Schema.Struct({ userId: Schema.String })),
      },
    })
    .input(
      std(
        Schema.Struct({
          userId: Schema.String,
          usagePeriod: Schema.optionalWith(AIUsagePeriodSchema, {
            default: () => '30d' as const,
          }),
          entityLimit: Schema.optional(
            CoerceNumber.pipe(
              Schema.greaterThanOrEqualTo(1),
              Schema.lessThanOrEqualTo(12),
            ),
          ),
          usageLimit: Schema.optional(
            CoerceNumber.pipe(
              Schema.greaterThanOrEqualTo(1),
              Schema.lessThanOrEqualTo(100),
            ),
          ),
        }),
      ),
    )
    .output(std(AdminUserDetailOutputSchema)),
});

const adminContract = oc.prefix('/admin').tag('admin').router({
  activity: activityContract,
  users: usersContract,
});

export default adminContract;
