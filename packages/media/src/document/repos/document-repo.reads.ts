import { withDb } from '@repo/db/effect';
import {
  document,
  documentListColumns,
  type Document,
  type DocumentId,
  type DocumentSource,
  type DocumentStatus,
} from '@repo/db/schema';
import { and, count as drizzleCount, desc, eq, sql } from 'drizzle-orm';
import { Effect } from 'effect';
import type { DocumentRepoService } from './document-repo';
import { DocumentNotFound } from '../../errors';

const requireDocument = (id: string) =>
  Effect.flatMap((doc: Document | null | undefined) =>
    doc ? Effect.succeed(doc) : Effect.fail(new DocumentNotFound({ id })),
  );

export const documentReadMethods: Pick<
  DocumentRepoService,
  | 'findById'
  | 'findByIdForUser'
  | 'list'
  | 'count'
  | 'findBySourceUrl'
  | 'findOrphanedResearch'
> = {
  findById: (id) =>
    withDb('documentRepo.findById', (db) =>
      db
        .select()
        .from(document)
        .where(eq(document.id, id as DocumentId))
        .limit(1)
        .then((rows) => rows[0]),
    ).pipe(requireDocument(id)),

  findByIdForUser: (id, userId) =>
    withDb('documentRepo.findByIdForUser', (db) =>
      db
        .select()
        .from(document)
        .where(
          and(
            eq(document.id, id as DocumentId),
            eq(document.createdBy, userId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]),
    ).pipe(requireDocument(id)),

  list: (options) =>
    withDb('documentRepo.list', (db) => {
      const filters = [];
      if (options.createdBy)
        filters.push(eq(document.createdBy, options.createdBy));
      if (options.source)
        filters.push(eq(document.source, options.source as DocumentSource));
      if (options.status)
        filters.push(eq(document.status, options.status as DocumentStatus));

      const conditions = filters.length > 0 ? and(...filters) : undefined;

      return db
        .select(documentListColumns)
        .from(document)
        .where(conditions)
        .orderBy(desc(document.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0);
    }),

  count: (options) =>
    withDb('documentRepo.count', async (db) => {
      const conditions = options?.createdBy
        ? eq(document.createdBy, options.createdBy)
        : undefined;
      const [result] = await db
        .select({ count: drizzleCount() })
        .from(document)
        .where(conditions);
      return result?.count ?? 0;
    }),

  findBySourceUrl: (url, createdBy) =>
    withDb('documentRepo.findBySourceUrl', (db) =>
      db
        .select()
        .from(document)
        .where(
          and(eq(document.sourceUrl, url), eq(document.createdBy, createdBy)),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null),
    ),

  findOrphanedResearch: () =>
    withDb('documentRepo.findOrphanedResearch', (db) =>
      db
        .select()
        .from(document)
        .where(
          and(
            eq(document.source, 'research'),
            sql`${document.researchConfig}->>'operationId' IS NOT NULL`,
            sql`${document.researchConfig}->>'researchStatus' = 'in_progress'`,
          ),
        ),
    ),
};
