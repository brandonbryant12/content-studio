import { withDb } from '@repo/db/effect';
import {
  infographic,
  infographicVersion,
  type Infographic,
  type InfographicId,
} from '@repo/db/schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import { Effect } from 'effect';
import type { InfographicRepoService } from './infographic-repo';
import { InfographicNotFound } from '../../errors';

const requireInfographic = (id: string) =>
  Effect.flatMap((row: Infographic | null | undefined) =>
    row ? Effect.succeed(row) : Effect.fail(new InfographicNotFound({ id })),
  );

export const infographicReadMethods: Pick<
  InfographicRepoService,
  'findById' | 'findByIdForUser' | 'list' | 'listVersions'
> = {
  findById: (id) =>
    withDb('infographicRepo.findById', async (db) => {
      const [row] = await db
        .select()
        .from(infographic)
        .where(eq(infographic.id, id as InfographicId))
        .limit(1);
      return row ?? null;
    }).pipe(requireInfographic(id)),

  findByIdForUser: (id, userId) =>
    withDb('infographicRepo.findByIdForUser', async (db) => {
      const [row] = await db
        .select()
        .from(infographic)
        .where(
          and(
            eq(infographic.id, id as InfographicId),
            eq(infographic.createdBy, userId),
          ),
        )
        .limit(1);
      return row ?? null;
    }).pipe(requireInfographic(id)),

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
