import { withDb, prepared } from '@repo/db/effect';
import {
  source,
  sourceListColumns,
  type Source,
  type SourceOrigin,
  type SourceStatus,
} from '@repo/db/schema';
import { and, count as drizzleCount, desc, eq, sql } from 'drizzle-orm';
import { Effect } from 'effect';
import type { SourceRepoService } from './source-repo';
import { SourceNotFound } from '../../errors';

const requireSource = (id: string) =>
  Effect.flatMap((doc: Source | null | undefined) =>
    doc ? Effect.succeed(doc) : Effect.fail(new SourceNotFound({ id })),
  );

export const sourceReadMethods: Pick<
  SourceRepoService,
  | 'findById'
  | 'findByIdForUser'
  | 'list'
  | 'count'
  | 'findBySourceUrl'
  | 'findOrphanedResearch'
> = {
  findById: (id) =>
    withDb('sourceRepo.findById', (db) =>
      prepared(db, 'sourceRepo.findById', (db) =>
        db
          .select()
          .from(source)
          .where(eq(source.id, sql.placeholder('id')))
          .limit(1)
          .prepare('sourceRepo_findById'),
      )
        .execute({ id })
        .then((rows) => rows[0]),
    ).pipe(requireSource(id)),

  findByIdForUser: (id, userId) =>
    withDb('sourceRepo.findByIdForUser', (db) =>
      prepared(db, 'sourceRepo.findByIdForUser', (db) =>
        db
          .select()
          .from(source)
          .where(
            and(
              eq(source.id, sql.placeholder('id')),
              eq(source.createdBy, sql.placeholder('userId')),
            ),
          )
          .limit(1)
          .prepare('sourceRepo_findByIdForUser'),
      )
        .execute({ id, userId })
        .then((rows) => rows[0]),
    ).pipe(requireSource(id)),

  list: (options) =>
    withDb('sourceRepo.list', (db) => {
      const filters = [];
      if (options.createdBy)
        filters.push(eq(source.createdBy, options.createdBy));
      if (options.source)
        filters.push(eq(source.source, options.source as SourceOrigin));
      if (options.status)
        filters.push(eq(source.status, options.status as SourceStatus));

      const conditions = filters.length > 0 ? and(...filters) : undefined;

      return db
        .select(sourceListColumns)
        .from(source)
        .where(conditions)
        .orderBy(desc(source.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0);
    }),

  count: (options) =>
    withDb('sourceRepo.count', async (db) => {
      const conditions = options?.createdBy
        ? eq(source.createdBy, options.createdBy)
        : undefined;
      const [result] = await db
        .select({ count: drizzleCount() })
        .from(source)
        .where(conditions);
      return result?.count ?? 0;
    }),

  findBySourceUrl: (url, createdBy) =>
    withDb('sourceRepo.findBySourceUrl', (db) =>
      db
        .select()
        .from(source)
        .where(and(eq(source.sourceUrl, url), eq(source.createdBy, createdBy)))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    ),

  findOrphanedResearch: () =>
    withDb('sourceRepo.findOrphanedResearch', (db) =>
      db
        .select()
        .from(source)
        .where(
          and(
            eq(source.source, 'research'),
            sql`${source.researchConfig}->>'operationId' IS NOT NULL`,
            sql`${source.researchConfig}->>'researchStatus' = 'in_progress'`,
          ),
        ),
    ),
};
