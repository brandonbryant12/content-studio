import { withDb, prepared } from '@repo/db/effect';
import {
  podcast,
  podcastListColumns,
  source,
  type Source,
  type SourceId,
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
import type { PodcastWithSources, PodcastRepoService } from './podcast-repo';
import type { DatabaseInstance } from '@repo/db/client';
import { SourceNotFound, PodcastNotFound } from '../../errors';

const requirePodcast = <T extends PodcastWithSources | null | undefined>(
  id: string,
) =>
  Effect.flatMap((pod: T) =>
    pod ? Effect.succeed(pod) : Effect.fail(new PodcastNotFound({ id })),
  );

const fetchSortedSources = async (
  db: DatabaseInstance,
  sourceIds: readonly SourceId[],
): Promise<Source[]> => {
  if (sourceIds.length === 0) {
    return [];
  }

  const docs = await db
    .select()
    .from(source)
    .where(inArray(source.id, sourceIds));

  const docMap = new Map(docs.map((d) => [d.id, d]));
  return sourceIds
    .map((docId) => docMap.get(docId))
    .filter((d): d is Source => d !== undefined);
};

export const podcastReadMethods: Pick<
  PodcastRepoService,
  'findById' | 'findByIdForUser' | 'list' | 'count' | 'verifySourcesExist'
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
      const sortedDocs = await fetchSortedSources(db, pod.sourceIds);

      return { ...pod, sources: sortedDocs };
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
      const sortedDocs = await fetchSortedSources(db, pod.sourceIds);

      return { ...pod, sources: sortedDocs };
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

  verifySourcesExist: (sourceIds, userId) =>
    Effect.gen(function* () {
      if (sourceIds.length === 0) {
        return [];
      }

      const result = yield* withDb('podcastRepo.verifySources', async (db) => {
        const docIds = sourceIds.map((id) => id as SourceId);
        const docs = await db
          .select()
          .from(source)
          .where(inArray(source.id, docIds));

        const foundIds = new Set(docs.map((d) => String(d.id)));
        const missingId = sourceIds.find((docId) => !foundIds.has(docId));
        const notOwnedId = docs.find((d) => d.createdBy !== userId)?.id;

        return {
          docs,
          missingId,
          notOwnedId: notOwnedId ? String(notOwnedId) : undefined,
        };
      });

      if (result.missingId) {
        return yield* Effect.fail(new SourceNotFound({ id: result.missingId }));
      }
      if (result.notOwnedId) {
        return yield* Effect.fail(
          new SourceNotFound({
            id: result.notOwnedId,
            message: 'Source not found or access denied',
          }),
        );
      }

      return result.docs;
    }),
};
