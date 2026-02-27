import { withDb } from '@repo/db/effect';
import {
  infographic,
  infographicVersion,
  InfographicStatus,
  type Infographic,
  type InfographicId,
} from '@repo/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { Effect } from 'effect';
import type {
  InfographicRepoService,
  InsertInfographic,
  InsertInfographicVersion,
  UpdateInfographic,
} from './infographic-repo';
import { InfographicNotFound } from '../../errors';

const requireInfographic = (id: string) =>
  Effect.flatMap((row: Infographic | null | undefined) =>
    row ? Effect.succeed(row) : Effect.fail(new InfographicNotFound({ id })),
  );

export const infographicWriteMethods: Pick<
  InfographicRepoService,
  | 'insert'
  | 'update'
  | 'delete'
  | 'insertVersion'
  | 'deleteOldVersions'
  | 'setApproval'
  | 'clearApproval'
> = {
  insert: (data: InsertInfographic) =>
    withDb('infographicRepo.insert', async (db) => {
      const [row] = await db
        .insert(infographic)
        .values({
          id: data.id,
          title: data.title,
          prompt: data.prompt,
          styleProperties: data.styleProperties ?? [],
          format: data.format,
          status: data.status ?? InfographicStatus.DRAFT,
          createdBy: data.createdBy,
        })
        .returning();
      return row!;
    }),

  update: (id: string, data: UpdateInfographic) =>
    withDb('infographicRepo.update', async (db) => {
      const updateValues: Record<string, unknown> = {
        ...Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== undefined),
        ),
        updatedAt: new Date(),
      };

      const [row] = await db
        .update(infographic)
        .set(updateValues)
        .where(eq(infographic.id, id as InfographicId))
        .returning();
      return row ?? null;
    }).pipe(requireInfographic(id)),

  delete: (id) =>
    withDb('infographicRepo.delete', async (db) => {
      const result = await db
        .delete(infographic)
        .where(eq(infographic.id, id as InfographicId))
        .returning({ id: infographic.id });
      return result.length > 0;
    }),

  insertVersion: (data: InsertInfographicVersion) =>
    withDb('infographicRepo.insertVersion', async (db) => {
      const [row] = await db
        .insert(infographicVersion)
        .values({
          infographicId: data.infographicId,
          versionNumber: data.versionNumber,
          prompt: data.prompt,
          styleProperties: data.styleProperties ?? [],
          format: data.format,
          imageStorageKey: data.imageStorageKey,
          thumbnailStorageKey: data.thumbnailStorageKey,
        })
        .returning();
      return row!;
    }),

  deleteOldVersions: (infographicId, keepCount) =>
    withDb('infographicRepo.deleteOldVersions', async (db) => {
      const toKeep = await db
        .select({ id: infographicVersion.id })
        .from(infographicVersion)
        .where(
          eq(infographicVersion.infographicId, infographicId as InfographicId),
        )
        .orderBy(desc(infographicVersion.versionNumber))
        .limit(keepCount);

      if (toKeep.length === 0) return 0;

      const keepIds = toKeep.map((v) => v.id);

      const allVersions = await db
        .select({ id: infographicVersion.id })
        .from(infographicVersion)
        .where(
          eq(infographicVersion.infographicId, infographicId as InfographicId),
        );

      const toDeleteIds = allVersions
        .filter((v) => !keepIds.includes(v.id))
        .map((v) => v.id);
      if (toDeleteIds.length === 0) return 0;

      await db
        .delete(infographicVersion)
        .where(inArray(infographicVersion.id, toDeleteIds));

      return toDeleteIds.length;
    }),

  setApproval: (id, approvedBy) =>
    withDb('infographicRepo.setApproval', async (db) => {
      const [row] = await db
        .update(infographic)
        .set({
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(infographic.id, id as InfographicId))
        .returning();
      return row ?? null;
    }).pipe(requireInfographic(id)),

  clearApproval: (id) =>
    withDb('infographicRepo.clearApproval', async (db) => {
      const [row] = await db
        .update(infographic)
        .set({
          approvedBy: null,
          approvedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(infographic.id, id as InfographicId))
        .returning();
      return row ?? null;
    }).pipe(requireInfographic(id)),
};
