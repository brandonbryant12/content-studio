import { withDb, prepared } from '@repo/db/effect';
import {
  infographic,
  infographicVersion,
  type Infographic,
  type InfographicId,
} from '@repo/db/schema';
import { and, asc, count as drizzleCount, desc, eq, sql } from 'drizzle-orm';
import { Effect } from 'effect';
import type { InfographicRepoService } from './infographic-repo';
import { InfographicNotFound } from '../../errors';

const requireInfographic = (id: string) =>
  Effect.flatMap((row: Infographic | null | undefined) =>
    row ? Effect.succeed(row) : Effect.fail(new InfographicNotFound({ id })),
  );

export const infographicReadMethods: Pick<
  InfographicRepoService,
  'findById' | 'findByIdForUser' | 'list' | 'count' | 'listVersions'
> = {
  findById: (id) =>
    withDb('infographicRepo.findById', (db) =>
      prepared(db, 'infographicRepo.findById', (db) =>
        db
          .select()
          .from(infographic)
          .where(eq(infographic.id, sql.placeholder('id')))
          .limit(1)
          .prepare('infographicRepo_findById'),
      )
        .execute({ id })
        .then((rows) => rows[0] ?? null),
    ).pipe(requireInfographic(id)),

  findByIdForUser: (id, userId) =>
    withDb('infographicRepo.findByIdForUser', (db) =>
      prepared(db, 'infographicRepo.findByIdForUser', (db) =>
        db
          .select()
          .from(infographic)
          .where(
            and(
              eq(infographic.id, sql.placeholder('id')),
              eq(infographic.createdBy, sql.placeholder('userId')),
            ),
          )
          .limit(1)
          .prepare('infographicRepo_findByIdForUser'),
      )
        .execute({ id, userId })
        .then((rows) => rows[0] ?? null),
    ).pipe(requireInfographic(id)),

  list: (options) =>
    withDb('infographicRepo.list', (db) =>
      db
        .select()
        .from(infographic)
        .where(eq(infographic.createdBy, options.createdBy))
        .orderBy(desc(infographic.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0),
    ),

  count: (options) =>
    withDb('infographicRepo.count', async (db) => {
      const [result] = await db
        .select({ count: drizzleCount() })
        .from(infographic)
        .where(eq(infographic.createdBy, options.createdBy));
      return result?.count ?? 0;
    }),

  listVersions: (infographicId) =>
    withDb('infographicRepo.listVersions', (db) =>
      db
        .select()
        .from(infographicVersion)
        .where(
          eq(infographicVersion.infographicId, infographicId as InfographicId),
        )
        .orderBy(asc(infographicVersion.versionNumber)),
    ),
};
