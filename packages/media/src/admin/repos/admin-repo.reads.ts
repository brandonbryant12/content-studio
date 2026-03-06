import { withDb } from '@repo/db/effect';
import {
  aiUsageEvent,
  infographic,
  persona,
  podcast,
  source,
  user,
  voiceover,
  type AIUsageEventModality,
} from '@repo/db/schema';
import {
  and,
  count as drizzleCount,
  desc,
  eq,
  gt,
  ilike,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { Effect } from 'effect';
import type {
  AdminRepoService,
  AdminUserEntityType,
  ListUserEntitiesOptions,
} from './admin-repo';
import { AdminUserNotFound } from '../../errors';

const requireUser = (userId: string) =>
  Effect.flatMap((record: typeof user.$inferSelect | null | undefined) =>
    record
      ? Effect.succeed(record)
      : Effect.fail(new AdminUserNotFound({ userId })),
  );

const getUsageWhere = (userId: string, since?: Date) =>
  since
    ? and(eq(aiUsageEvent.userId, userId), gt(aiUsageEvent.createdAt, since))
    : eq(aiUsageEvent.userId, userId);

const costSum = sql<number>`coalesce(sum(${aiUsageEvent.estimatedCostUsdMicros}), 0)`;
const pricedEventCount = sql<number>`count(${aiUsageEvent.estimatedCostUsdMicros})`;
const falseEntityQuery = sql`
  select
    null::text as "entityType",
    null::text as "entityId",
    null::text as "title",
    null::text as "subtitle",
    null::text as "status",
    null::timestamptz as "createdAt",
    null::timestamptz as "updatedAt"
  where false
`;

const normalizeQuery = (query?: string) => {
  const normalized = query?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

const matchesEntityType = (
  selectedType: AdminUserEntityType | undefined,
  entityType: AdminUserEntityType,
) => selectedType === undefined || selectedType === entityType;

const buildUserEntityUnion = (options: ListUserEntitiesOptions): SQL => {
  const searchQuery = normalizeQuery(options.query);
  const searchPattern = searchQuery ? `%${searchQuery}%` : undefined;
  const statements: SQL[] = [];

  if (matchesEntityType(options.entityType, 'source')) {
    const where: SQL[] = [sql`${source.createdBy} = ${options.userId}`];
    if (searchPattern) {
      where.push(sql`${source.title} ilike ${searchPattern}`);
    }

    statements.push(sql`
      select
        'source'::text as "entityType",
        ${source.id}::text as "entityId",
        ${source.title} as "title",
        ${source.source}::text as "subtitle",
        ${source.status}::text as "status",
        ${source.createdAt} as "createdAt",
        ${source.updatedAt} as "updatedAt"
      from ${source}
      where ${sql.join(where, sql` and `)}
    `);
  }

  if (matchesEntityType(options.entityType, 'podcast')) {
    const where: SQL[] = [sql`${podcast.createdBy} = ${options.userId}`];
    if (searchPattern) {
      where.push(sql`${podcast.title} ilike ${searchPattern}`);
    }

    statements.push(sql`
      select
        'podcast'::text as "entityType",
        ${podcast.id}::text as "entityId",
        ${podcast.title} as "title",
        ${podcast.format}::text as "subtitle",
        ${podcast.status}::text as "status",
        ${podcast.createdAt} as "createdAt",
        ${podcast.updatedAt} as "updatedAt"
      from ${podcast}
      where ${sql.join(where, sql` and `)}
    `);
  }

  if (matchesEntityType(options.entityType, 'voiceover')) {
    const where: SQL[] = [sql`${voiceover.createdBy} = ${options.userId}`];
    if (searchPattern) {
      where.push(sql`${voiceover.title} ilike ${searchPattern}`);
    }

    statements.push(sql`
      select
        'voiceover'::text as "entityType",
        ${voiceover.id}::text as "entityId",
        ${voiceover.title} as "title",
        coalesce(${voiceover.voiceName}, ${voiceover.voice}) as "subtitle",
        ${voiceover.status}::text as "status",
        ${voiceover.createdAt} as "createdAt",
        ${voiceover.updatedAt} as "updatedAt"
      from ${voiceover}
      where ${sql.join(where, sql` and `)}
    `);
  }

  if (matchesEntityType(options.entityType, 'persona')) {
    const where: SQL[] = [sql`${persona.createdBy} = ${options.userId}`];
    if (searchPattern) {
      where.push(sql`${persona.name} ilike ${searchPattern}`);
    }

    statements.push(sql`
      select
        'persona'::text as "entityType",
        ${persona.id}::text as "entityId",
        ${persona.name} as "title",
        ${persona.role} as "subtitle",
        null::text as "status",
        ${persona.createdAt} as "createdAt",
        ${persona.updatedAt} as "updatedAt"
      from ${persona}
      where ${sql.join(where, sql` and `)}
    `);
  }

  if (matchesEntityType(options.entityType, 'infographic')) {
    const where: SQL[] = [sql`${infographic.createdBy} = ${options.userId}`];
    if (searchPattern) {
      where.push(sql`${infographic.title} ilike ${searchPattern}`);
    }

    statements.push(sql`
      select
        'infographic'::text as "entityType",
        ${infographic.id}::text as "entityId",
        ${infographic.title} as "title",
        ${infographic.format}::text as "subtitle",
        ${infographic.status}::text as "status",
        ${infographic.createdAt} as "createdAt",
        ${infographic.updatedAt} as "updatedAt"
      from ${infographic}
      where ${sql.join(where, sql` and `)}
    `);
  }

  if (statements.length === 0) {
    return falseEntityQuery;
  }

  return statements.length === 1
    ? statements[0]!
    : sql.join(statements, sql` union all `);
};

export const adminReadMethods: Pick<
  AdminRepoService,
  | 'searchUsers'
  | 'listUserEntities'
  | 'countUserEntities'
  | 'findUserById'
  | 'listUserAIUsageEvents'
  | 'getUserAIUsageSummary'
> = {
  searchUsers: (options) =>
    withDb('adminRepo.searchUsers', (db) => {
      const normalizedQuery = options.query?.trim();
      const where = normalizedQuery
        ? or(
            ilike(user.name, `%${normalizedQuery}%`),
            ilike(user.email, `%${normalizedQuery}%`),
          )
        : undefined;

      return db
        .select()
        .from(user)
        .where(where)
        .orderBy(desc(user.createdAt))
        .limit(options.limit);
    }),

  listUserEntities: (options) =>
    withDb('adminRepo.listUserEntities', async (db) => {
      const unionQuery = buildUserEntityUnion(options);
      const result = await db.execute(sql`
        select *
        from (${unionQuery}) as user_entities
        order by "updatedAt" desc, "createdAt" desc, "entityId" desc
        limit ${options.limit}
        offset ${options.offset}
      `);

      return result.rows as Array<{
        entityType: AdminUserEntityType;
        entityId: string;
        title: string;
        subtitle: string | null;
        status: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>;
    }),

  countUserEntities: (options) =>
    withDb('adminRepo.countUserEntities', async (db) => {
      const unionQuery = buildUserEntityUnion({
        ...options,
        limit: 1,
        offset: 0,
      });
      const result = await db.execute(sql`
        select count(*)::int as total
        from (${unionQuery}) as user_entities
      `);

      return Number(result.rows[0]?.total ?? 0);
    }),

  findUserById: (userId) =>
    withDb('adminRepo.findUserById', (db) =>
      db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)
        .then((rows) => rows[0]),
    ).pipe(requireUser(userId)),

  listUserAIUsageEvents: (options) =>
    withDb('adminRepo.listUserAIUsageEvents', (db) =>
      db
        .select()
        .from(aiUsageEvent)
        .where(getUsageWhere(options.userId, options.since))
        .orderBy(desc(aiUsageEvent.createdAt))
        .limit(options.limit),
    ),

  getUserAIUsageSummary: (userId, since) =>
    withDb('adminRepo.getUserAIUsageSummary', async (db) => {
      const where = getUsageWhere(userId, since);

      const [totalRow, byModality, byProvider, timeline] = await Promise.all([
        db
          .select({
            totalEvents: drizzleCount(),
            totalEstimatedCostUsdMicros: costSum,
            pricedEventCount,
          })
          .from(aiUsageEvent)
          .where(where)
          .then((rows) => rows[0]),
        db
          .select({
            modality: aiUsageEvent.modality,
            count: drizzleCount(),
            estimatedCostUsdMicros: costSum,
            pricedEventCount,
          })
          .from(aiUsageEvent)
          .where(where)
          .groupBy(aiUsageEvent.modality)
          .orderBy(desc(drizzleCount())),
        db
          .select({
            provider: aiUsageEvent.provider,
            count: drizzleCount(),
            estimatedCostUsdMicros: costSum,
            pricedEventCount,
          })
          .from(aiUsageEvent)
          .where(where)
          .groupBy(aiUsageEvent.provider)
          .orderBy(desc(drizzleCount())),
        db
          .select({
            day: sql<string>`to_char(date_trunc('day', ${aiUsageEvent.createdAt}), 'YYYY-MM-DD')`,
            count: drizzleCount(),
            estimatedCostUsdMicros: costSum,
            pricedEventCount,
          })
          .from(aiUsageEvent)
          .where(where)
          .groupBy(sql`date_trunc('day', ${aiUsageEvent.createdAt})`)
          .orderBy(desc(sql`date_trunc('day', ${aiUsageEvent.createdAt})`))
          .limit(14),
      ]);

      return {
        totalEvents: totalRow?.totalEvents ?? 0,
        totalEstimatedCostUsdMicros: Number(
          totalRow?.totalEstimatedCostUsdMicros ?? 0,
        ),
        pricedEventCount: Number(totalRow?.pricedEventCount ?? 0),
        byModality: byModality.map((row) => ({
          modality: row.modality as AIUsageEventModality,
          count: row.count,
          estimatedCostUsdMicros: Number(row.estimatedCostUsdMicros),
          pricedEventCount: Number(row.pricedEventCount),
        })),
        byProvider: byProvider.map((row) => ({
          provider: row.provider,
          count: row.count,
          estimatedCostUsdMicros: Number(row.estimatedCostUsdMicros),
          pricedEventCount: Number(row.pricedEventCount),
        })),
        timeline: timeline.map((row) => ({
          day: row.day,
          count: row.count,
          estimatedCostUsdMicros: Number(row.estimatedCostUsdMicros),
          pricedEventCount: Number(row.pricedEventCount),
        })),
      };
    }),
};
