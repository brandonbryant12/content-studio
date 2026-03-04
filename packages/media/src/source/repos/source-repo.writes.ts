import { withDb } from '@repo/db/effect';
import {
  source,
  SourceStatus,
  type Source,
  type SourceId,
} from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { Effect } from 'effect';
import type {
  SourceRepoService,
  InsertSourceInput,
  UpdateContentInput,
  UpdateSourceInput,
} from './source-repo';
import { SourceNotFound } from '../../errors';

const requireSource = (id: string) =>
  Effect.flatMap((doc: Source | null | undefined) =>
    doc ? Effect.succeed(doc) : Effect.fail(new SourceNotFound({ id })),
  );

export const sourceWriteMethods: Pick<
  SourceRepoService,
  | 'insert'
  | 'update'
  | 'delete'
  | 'updateStatus'
  | 'updateContent'
  | 'updateResearchConfig'
> = {
  insert: (data: InsertSourceInput) =>
    withDb('sourceRepo.insert', async (db) => {
      const [doc] = await db.insert(source).values(data).returning();
      return doc!;
    }),

  update: (id: string, data: UpdateSourceInput) =>
    withDb('sourceRepo.update', async (db) => {
      const updates: Partial<typeof source.$inferInsert> = {
        ...data,
        updatedAt: new Date(),
      };

      const [doc] = await db
        .update(source)
        .set(updates)
        .where(eq(source.id, id as SourceId))
        .returning();
      return doc;
    }).pipe(requireSource(id)),

  delete: (id) =>
    withDb('sourceRepo.delete', async (db) => {
      const result = await db
        .delete(source)
        .where(eq(source.id, id as SourceId))
        .returning({ id: source.id });
      return result.length > 0;
    }),

  updateStatus: (id: string, status: SourceStatus, errorMessage?: string) =>
    withDb('sourceRepo.updateStatus', async (db) => {
      const updates: Partial<typeof source.$inferInsert> = {
        status,
        updatedAt: new Date(),
        errorMessage:
          status === SourceStatus.FAILED ? (errorMessage ?? null) : null,
      };

      const [doc] = await db
        .update(source)
        .set(updates)
        .where(eq(source.id, id as SourceId))
        .returning();
      return doc;
    }).pipe(requireSource(id)),

  updateContent: (id: string, data: UpdateContentInput) =>
    withDb('sourceRepo.updateContent', async (db) => {
      const updates: Partial<typeof source.$inferInsert> = {
        ...data,
        updatedAt: new Date(),
      };

      const [doc] = await db
        .update(source)
        .set(updates)
        .where(eq(source.id, id as SourceId))
        .returning();
      return doc;
    }).pipe(requireSource(id)),

  updateResearchConfig: (id, config) =>
    withDb('sourceRepo.updateResearchConfig', async (db) => {
      const [doc] = await db
        .update(source)
        .set({
          researchConfig: config,
          updatedAt: new Date(),
        })
        .where(eq(source.id, id as SourceId))
        .returning();
      return doc;
    }).pipe(requireSource(id)),
};
