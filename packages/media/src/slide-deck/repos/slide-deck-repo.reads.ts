import { withDb } from '@repo/db/effect';
import {
  slideDeck,
  slideDeckVersion,
  type SlideDeck,
  type SlideDeckId,
} from '@repo/db/schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import { Effect } from 'effect';
import type { SlideDeckRepoService } from './slide-deck-repo';
import { SlideDeckNotFound } from '../../errors';

const requireSlideDeck = (id: string) =>
  Effect.flatMap((row: SlideDeck | null | undefined) =>
    row ? Effect.succeed(row) : Effect.fail(new SlideDeckNotFound({ id })),
  );

export const slideDeckReadMethods: Pick<
  SlideDeckRepoService,
  'findById' | 'findByIdForUser' | 'list' | 'listVersions'
> = {
  findById: (id) =>
    withDb('slideDeckRepo.findById', async (db) => {
      const [row] = await db
        .select()
        .from(slideDeck)
        .where(eq(slideDeck.id, id as SlideDeckId))
        .limit(1);
      return row ?? null;
    }).pipe(requireSlideDeck(id)),

  findByIdForUser: (id, userId) =>
    withDb('slideDeckRepo.findByIdForUser', async (db) => {
      const [row] = await db
        .select()
        .from(slideDeck)
        .where(
          and(
            eq(slideDeck.id, id as SlideDeckId),
            eq(slideDeck.createdBy, userId),
          ),
        )
        .limit(1);
      return row ?? null;
    }).pipe(requireSlideDeck(id)),

  list: (options) =>
    withDb('slideDeckRepo.list', (db) =>
      db
        .select()
        .from(slideDeck)
        .where(eq(slideDeck.createdBy, options.createdBy))
        .orderBy(desc(slideDeck.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0),
    ),

  listVersions: (slideDeckId) =>
    withDb('slideDeckRepo.listVersions', (db) =>
      db
        .select()
        .from(slideDeckVersion)
        .where(eq(slideDeckVersion.slideDeckId, slideDeckId as SlideDeckId))
        .orderBy(asc(slideDeckVersion.versionNumber)),
    ),
};
