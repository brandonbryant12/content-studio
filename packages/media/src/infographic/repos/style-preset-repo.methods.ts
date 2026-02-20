import { withDb } from '@repo/db/effect';
import {
  infographicStylePreset,
  type InfographicStylePreset,
  type InfographicStylePresetId,
} from '@repo/db/schema';
import { eq, isNull, or } from 'drizzle-orm';
import { Effect } from 'effect';
import type { StylePresetRepoService } from './style-preset-repo';
import { StylePresetNotFound } from '../../errors';

const requirePreset = (id: string) =>
  Effect.flatMap((row: InfographicStylePreset | null | undefined) =>
    row ? Effect.succeed(row) : Effect.fail(new StylePresetNotFound({ id })),
  );

export const stylePresetMethods: StylePresetRepoService = {
  insert: (data) =>
    withDb('stylePresetRepo.insert', async (db) => {
      const [row] = await db
        .insert(infographicStylePreset)
        .values({
          id: data.id as InfographicStylePresetId | undefined,
          name: data.name,
          properties: data.properties,
          isBuiltIn: data.isBuiltIn ?? false,
          createdBy: data.createdBy ?? null,
        })
        .returning();
      return row!;
    }),

  findById: (id) =>
    withDb('stylePresetRepo.findById', async (db) => {
      const [row] = await db
        .select()
        .from(infographicStylePreset)
        .where(eq(infographicStylePreset.id, id as InfographicStylePresetId))
        .limit(1);
      return row ?? null;
    }).pipe(requirePreset(id)),

  list: (userId) =>
    withDb('stylePresetRepo.list', (db) =>
      db
        .select()
        .from(infographicStylePreset)
        .where(
          or(
            eq(infographicStylePreset.isBuiltIn, true),
            eq(infographicStylePreset.createdBy, userId),
            isNull(infographicStylePreset.createdBy),
          ),
        )
        .orderBy(infographicStylePreset.name),
    ),

  delete: (id) =>
    withDb('stylePresetRepo.delete', async (db) => {
      const result = await db
        .delete(infographicStylePreset)
        .where(eq(infographicStylePreset.id, id as InfographicStylePresetId))
        .returning({ id: infographicStylePreset.id });
      return result.length > 0;
    }),
};
