import { withDb, prepared } from '@repo/db/effect';
import {
  podcast,
  podcastListColumns,
  document,
  type Document,
  type DocumentId,
} from '@repo/db/schema';
import {
  and,
  count as drizzleCount,
  desc,
  eq,
  inArray,
  sql,
} from 'drizzle-orm';
import { Effect } from 'effect';
import type { PodcastWithDocuments, PodcastRepoService } from './podcast-repo';
import type { DatabaseInstance } from '@repo/db/client';
import { DocumentNotFound, PodcastNotFound } from '../../errors';

const requirePodcast = <T extends PodcastWithDocuments | null | undefined>(
  id: string,
) =>
  Effect.flatMap((pod: T) =>
    pod ? Effect.succeed(pod) : Effect.fail(new PodcastNotFound({ id })),
  );

const fetchSortedSourceDocuments = async (
  db: DatabaseInstance,
  sourceDocumentIds: readonly DocumentId[],
): Promise<Document[]> => {
  if (sourceDocumentIds.length === 0) {
    return [];
  }

  const docs = await db
    .select()
    .from(document)
    .where(inArray(document.id, sourceDocumentIds));

  const docMap = new Map(docs.map((d) => [d.id, d]));
  return sourceDocumentIds
    .map((docId) => docMap.get(docId))
    .filter((d): d is Document => d !== undefined);
};

export const podcastReadMethods: Pick<
  PodcastRepoService,
  'findById' | 'findByIdForUser' | 'list' | 'count' | 'verifyDocumentsExist'
> = {
  findById: (id) =>
    withDb('podcastRepo.findById', async (db) => {
      const [pod] = await prepared(db, 'podcastRepo.findById', (db) =>
        db
          .select()
          .from(podcast)
          .where(eq(podcast.id, sql.placeholder('id')))
          .limit(1)
          .prepare('podcastRepo_findById'),
      ).execute({ id });

      if (!pod) return null;
      const sortedDocs = await fetchSortedSourceDocuments(
        db,
        pod.sourceDocumentIds,
      );

      return { ...pod, documents: sortedDocs };
    }).pipe(requirePodcast(id)),

  findByIdForUser: (id, userId) =>
    withDb('podcastRepo.findByIdForUser', async (db) => {
      const [pod] = await prepared(db, 'podcastRepo.findByIdForUser', (db) =>
        db
          .select()
          .from(podcast)
          .where(
            and(
              eq(podcast.id, sql.placeholder('id')),
              eq(podcast.createdBy, sql.placeholder('userId')),
            ),
          )
          .limit(1)
          .prepare('podcastRepo_findByIdForUser'),
      ).execute({ id, userId });
      if (!pod) return null;
      const sortedDocs = await fetchSortedSourceDocuments(
        db,
        pod.sourceDocumentIds,
      );

      return { ...pod, documents: sortedDocs };
    }).pipe(requirePodcast(id)),

  list: (options) =>
    withDb('podcastRepo.list', (db) => {
      const createdBy = options.userId || options.createdBy;

      return db
        .select(podcastListColumns)
        .from(podcast)
        .where(createdBy ? eq(podcast.createdBy, createdBy) : undefined)
        .orderBy(desc(podcast.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0);
    }),

  count: (options) =>
    withDb('podcastRepo.count', async (db) => {
      const createdBy = options?.userId || options?.createdBy;

      const [result] = await db
        .select({ count: drizzleCount() })
        .from(podcast)
        .where(createdBy ? eq(podcast.createdBy, createdBy) : undefined);
      return result?.count ?? 0;
    }),

  verifyDocumentsExist: (documentIds, userId) =>
    Effect.gen(function* () {
      if (documentIds.length === 0) {
        return [];
      }

      const result = yield* withDb(
        'podcastRepo.verifyDocuments',
        async (db) => {
          const docIds = documentIds.map((id) => id as DocumentId);
          const docs = await db
            .select()
            .from(document)
            .where(inArray(document.id, docIds));

          const foundIds = new Set(docs.map((d) => String(d.id)));
          const missingId = documentIds.find((docId) => !foundIds.has(docId));
          const notOwnedId = docs.find((d) => d.createdBy !== userId)?.id;

          return {
            docs,
            missingId,
            notOwnedId: notOwnedId ? String(notOwnedId) : undefined,
          };
        },
      );

      if (result.missingId) {
        return yield* Effect.fail(
          new DocumentNotFound({ id: result.missingId }),
        );
      }
      if (result.notOwnedId) {
        return yield* Effect.fail(
          new DocumentNotFound({
            id: result.notOwnedId,
            message: 'Document not found or access denied',
          }),
        );
      }

      return result.docs;
    }),
};
