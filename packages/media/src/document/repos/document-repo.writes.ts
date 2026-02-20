import { withDb } from '@repo/db/effect';
import {
  document,
  type Document,
  type DocumentId,
  type DocumentStatus,
} from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { Effect } from 'effect';
import type {
  DocumentRepoService,
  InsertDocumentInput,
  UpdateContentInput,
  UpdateDocumentInput,
} from './document-repo';
import { DocumentNotFound } from '../../errors';

const requireDocument = (id: string) =>
  Effect.flatMap((doc: Document | null | undefined) =>
    doc ? Effect.succeed(doc) : Effect.fail(new DocumentNotFound({ id })),
  );

export const documentWriteMethods: Pick<
  DocumentRepoService,
  | 'insert'
  | 'update'
  | 'delete'
  | 'updateStatus'
  | 'updateContent'
  | 'updateResearchConfig'
> = {
  insert: (data: InsertDocumentInput) =>
    withDb('documentRepo.insert', async (db) => {
      const [doc] = await db.insert(document).values(data).returning();
      return doc!;
    }),

  update: (id: string, data: UpdateDocumentInput) =>
    withDb('documentRepo.update', async (db) => {
      const updates: Partial<typeof document.$inferInsert> = {
        ...data,
        updatedAt: new Date(),
      };

      const [doc] = await db
        .update(document)
        .set(updates)
        .where(eq(document.id, id as DocumentId))
        .returning();
      return doc;
    }).pipe(requireDocument(id)),

  delete: (id) =>
    withDb('documentRepo.delete', async (db) => {
      const result = await db
        .delete(document)
        .where(eq(document.id, id as DocumentId))
        .returning({ id: document.id });
      return result.length > 0;
    }),

  updateStatus: (id: string, status: DocumentStatus, errorMessage?: string) =>
    withDb('documentRepo.updateStatus', async (db) => {
      const updates: Partial<typeof document.$inferInsert> = {
        status,
        updatedAt: new Date(),
        errorMessage: status === 'failed' ? (errorMessage ?? null) : null,
      };

      const [doc] = await db
        .update(document)
        .set(updates)
        .where(eq(document.id, id as DocumentId))
        .returning();
      return doc;
    }).pipe(requireDocument(id)),

  updateContent: (id: string, data: UpdateContentInput) =>
    withDb('documentRepo.updateContent', async (db) => {
      const updates: Partial<typeof document.$inferInsert> = {
        ...data,
        updatedAt: new Date(),
      };

      const [doc] = await db
        .update(document)
        .set(updates)
        .where(eq(document.id, id as DocumentId))
        .returning();
      return doc;
    }).pipe(requireDocument(id)),

  updateResearchConfig: (id, config) =>
    withDb('documentRepo.updateResearchConfig', async (db) => {
      const [doc] = await db
        .update(document)
        .set({
          researchConfig: config,
          updatedAt: new Date(),
        })
        .where(eq(document.id, id as DocumentId))
        .returning();
      return doc;
    }).pipe(requireDocument(id)),
};
