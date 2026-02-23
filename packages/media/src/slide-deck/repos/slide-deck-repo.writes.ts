import { withDb } from '@repo/db/effect';
import {
  slideDeck,
  slideDeckVersion,
  type SlideDeck,
  type SlideDeckId,
} from '@repo/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { Effect } from 'effect';
import type {
  InsertSlideDeck,
  InsertSlideDeckVersion,
  SlideDeckRepoService,
  UpdateSlideDeck,
} from './slide-deck-repo';
import { SlideDeckNotFound } from '../../errors';

const requireSlideDeck = (id: string) =>
  Effect.flatMap((row: SlideDeck | null | undefined) =>
    row ? Effect.succeed(row) : Effect.fail(new SlideDeckNotFound({ id })),
  );

export const slideDeckWriteMethods: Pick<
  SlideDeckRepoService,
  'insert' | 'update' | 'delete' | 'insertVersion' | 'deleteOldVersions'
> = {
  insert: (data: InsertSlideDeck) =>
    withDb('slideDeckRepo.insert', async (db) => {
      const [row] = await db
        .insert(slideDeck)
        .values({
          id: data.id,
          title: data.title,
          prompt: data.prompt,
          sourceDocumentIds: data.sourceDocumentIds ?? [],
          theme: data.theme,
          slides: data.slides ?? [],
          generatedHtml: data.generatedHtml ?? null,
          status: data.status ?? 'draft',
          createdBy: data.createdBy,
        })
        .returning();
      return row!;
    }),

  update: (id: string, data: UpdateSlideDeck) =>
    withDb('slideDeckRepo.update', async (db) => {
      const updateValues: Record<string, unknown> = {
        ...Object.fromEntries(
          Object.entries(data).filter(([, value]) => value !== undefined),
        ),
        updatedAt: new Date(),
      };

      const [row] = await db
        .update(slideDeck)
        .set(updateValues)
        .where(eq(slideDeck.id, id as SlideDeckId))
        .returning();
      return row ?? null;
    }).pipe(requireSlideDeck(id)),

  delete: (id) =>
    withDb('slideDeckRepo.delete', async (db) => {
      const result = await db
        .delete(slideDeck)
        .where(eq(slideDeck.id, id as SlideDeckId))
        .returning({ id: slideDeck.id });
      return result.length > 0;
    }),

  insertVersion: (data: InsertSlideDeckVersion) =>
    withDb('slideDeckRepo.insertVersion', async (db) => {
      const [row] = await db
        .insert(slideDeckVersion)
        .values({
          slideDeckId: data.slideDeckId,
          versionNumber: data.versionNumber,
          prompt: data.prompt,
          sourceDocumentIds: data.sourceDocumentIds ?? [],
          theme: data.theme,
          slides: data.slides,
          generatedHtml: data.generatedHtml,
        })
        .returning();
      return row!;
    }),

  deleteOldVersions: (slideDeckId, keepCount) =>
    withDb('slideDeckRepo.deleteOldVersions', async (db) => {
      const toKeep = await db
        .select({ id: slideDeckVersion.id })
        .from(slideDeckVersion)
        .where(eq(slideDeckVersion.slideDeckId, slideDeckId as SlideDeckId))
        .orderBy(desc(slideDeckVersion.versionNumber))
        .limit(keepCount);

      if (toKeep.length === 0) return 0;

      const keepIds = toKeep.map((version) => version.id);
      const allVersions = await db
        .select({ id: slideDeckVersion.id })
        .from(slideDeckVersion)
        .where(eq(slideDeckVersion.slideDeckId, slideDeckId as SlideDeckId));

      const toDeleteIds = allVersions
        .filter((version) => !keepIds.includes(version.id))
        .map((version) => version.id);
      if (toDeleteIds.length === 0) return 0;

      await db
        .delete(slideDeckVersion)
        .where(inArray(slideDeckVersion.id, toDeleteIds));

      return toDeleteIds.length;
    }),
};
