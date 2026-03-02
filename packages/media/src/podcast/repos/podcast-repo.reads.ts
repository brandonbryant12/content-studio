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
import { DocumentNotFound, PodcastNotFound } from '../../errors';

const requirePodcast = <T extends PodcastWithDocuments | null | undefined>(
  id: string,
) =>
  Effect.flatMap((pod: T) =>
    pod ? Effect.succeed(pod) : Effect.fail(new PodcastNotFound({ id })),
  );

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

      const docs =
        pod.sourceDocumentIds.length > 0
          ? await db
              .select()
              .from(document)
              .where(inArray(document.id, pod.sourceDocumentIds))
          : [];

      const docMap = new Map(docs.map((d) => [d.id, d]));
      const sortedDocs = pod.sourceDocumentIds
        .map((docId) => docMap.get(docId))
        .filter((d): d is Document => d !== undefined);

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

      const docs =
        pod.sourceDocumentIds.length > 0
          ? await db
              .select()
              .from(document)
              .where(inArray(document.id, pod.sourceDocumentIds))
          : [];

      const docMap = new Map(docs.map((d) => [d.id, d]));
      const sortedDocs = pod.sourceDocumentIds
        .map((docId) => docMap.get(docId))
        .filter((d): d is Document => d !== undefined);

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
    withDb('podcastRepo.verifyDocuments', async (db) => {
      const docIds = [...documentIds] as DocumentId[];
      if (docIds.length === 0) {
        return {
          docs: [] as Document[],
          missingId: undefined as string | undefined,
          notOwnedId: undefined as string | undefined,
        };
      }

      const docs = await db
        .select()
        .from(document)
        .where(inArray(document.id, docIds));

      const foundIds = new Set(docs.map((d) => d.id as string));
      const missingId = docIds.find((docId) => !foundIds.has(docId as string));

      const notOwned = docs.find((d) => d.createdBy !== userId);

      return {
        docs,
        missingId: missingId as string | undefined,
        notOwnedId: notOwned?.id as string | undefined,
      };
    }).pipe(
      Effect.flatMap((result) => {
        if (result.missingId) {
          return Effect.fail(new DocumentNotFound({ id: result.missingId }));
        }
        if (result.notOwnedId) {
          return Effect.fail(
            new DocumentNotFound({
              id: result.notOwnedId,
              message: 'Document not found or access denied',
            }),
          );
        }
        return Effect.succeed(result.docs);
      }),
    ),
};
