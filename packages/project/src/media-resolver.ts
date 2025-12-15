import {
  document,
  podcast,
  mediaSource,
  type Document,
  type Podcast,
  type ProjectMedia,
  type ContentType,
} from '@repo/db/schema';
import { withDb } from '@repo/effect/db';
import { MediaNotFound } from '@repo/effect/errors';
import { inArray, and, eq, or } from 'drizzle-orm';
import { Effect } from 'effect';
import type {
  ProjectMediaItem,
  DocumentMediaItem,
  PodcastMediaItem,
  SourceRef,
} from './types';

/**
 * Groups project media items by their media type for batch querying.
 */
function groupByMediaType(items: ProjectMedia[]): {
  documents: ProjectMedia[];
  podcasts: ProjectMedia[];
} {
  const documents: ProjectMedia[] = [];
  const podcasts: ProjectMedia[] = [];

  for (const item of items) {
    if (item.mediaType === 'document') {
      documents.push(item);
    } else if (item.mediaType === 'podcast') {
      podcasts.push(item);
    }
  }

  return { documents, podcasts };
}

/**
 * Resolves document IDs to full document objects.
 */
const resolveDocuments = (ids: string[]) =>
  withDb('media.resolveDocuments', async (db) => {
    if (ids.length === 0) return [];
    return db.select().from(document).where(inArray(document.id, ids));
  });

/**
 * Resolves podcast IDs to full podcast objects.
 */
const resolvePodcasts = (ids: string[]) =>
  withDb('media.resolvePodcasts', async (db) => {
    if (ids.length === 0) return [];
    return db.select().from(podcast).where(inArray(podcast.id, ids));
  });

/**
 * Resolves an array of ProjectMedia junction records to full ProjectMediaItem objects
 * with resolved media data.
 *
 * Performs batch queries grouped by media type for efficiency.
 */
export const resolveProjectMedia = (items: ProjectMedia[]) =>
  Effect.gen(function* () {
    if (items.length === 0) {
      return [] as ProjectMediaItem[];
    }

    const grouped = groupByMediaType(items);

    // Batch-resolve all media in parallel
    const [documents, podcasts] = yield* Effect.all([
      resolveDocuments(grouped.documents.map((i) => i.mediaId)),
      resolvePodcasts(grouped.podcasts.map((i) => i.mediaId)),
    ]);

    // Create lookup maps for O(1) access
    const documentMap = new Map<string, Document>(
      documents.map((d) => [d.id, d]),
    );
    const podcastMap = new Map<string, Podcast>(podcasts.map((p) => [p.id, p]));

    // Map junction records to resolved items, preserving original order
    const resolved: ProjectMediaItem[] = [];
    const missing: { mediaType: string; mediaId: string }[] = [];

    for (const item of items) {
      if (item.mediaType === 'document') {
        const media = documentMap.get(item.mediaId);
        if (media) {
          resolved.push({
            id: item.id,
            projectId: item.projectId,
            mediaType: 'document',
            mediaId: item.mediaId,
            order: item.order,
            createdAt: item.createdAt,
            media,
          } satisfies DocumentMediaItem);
        } else {
          missing.push({ mediaType: 'document', mediaId: item.mediaId });
        }
      } else if (item.mediaType === 'podcast') {
        const media = podcastMap.get(item.mediaId);
        if (media) {
          resolved.push({
            id: item.id,
            projectId: item.projectId,
            mediaType: 'podcast',
            mediaId: item.mediaId,
            order: item.order,
            createdAt: item.createdAt,
            media,
          } satisfies PodcastMediaItem);
        } else {
          missing.push({ mediaType: 'podcast', mediaId: item.mediaId });
        }
      }
    }

    // Report first missing media item as error
    if (missing.length > 0) {
      yield* Effect.fail(
        new MediaNotFound({
          mediaType: missing[0]!.mediaType,
          mediaId: missing[0]!.mediaId,
          message: `Media item not found: ${missing[0]!.mediaType}/${missing[0]!.mediaId}`,
        }),
      );
    }

    // Sort by order to preserve original ordering
    return resolved.sort((a, b) => a.order - b.order);
  });

/**
 * Fetches source references for multiple media items in batch.
 * Returns a map of (mediaType:mediaId) -> SourceRef[]
 */
const fetchSourcesForMediaItems = (
  items: { mediaType: ContentType; mediaId: string }[],
) =>
  withDb('media.fetchSources', async (db) => {
    if (items.length === 0) {
      return new Map<string, SourceRef[]>();
    }

    // Build conditions for all items
    const conditions = items.map((item) =>
      and(
        eq(mediaSource.targetType, item.mediaType),
        eq(mediaSource.targetId, item.mediaId),
      ),
    );

    const sources = await db
      .select()
      .from(mediaSource)
      .where(or(...conditions))
      .orderBy(mediaSource.order);

    // Group by target
    const sourceMap = new Map<string, SourceRef[]>();
    for (const source of sources) {
      const key = `${source.targetType}:${source.targetId}`;
      const existing = sourceMap.get(key) ?? [];
      existing.push({
        sourceType: source.sourceType,
        sourceId: source.sourceId,
      });
      sourceMap.set(key, existing);
    }

    return sourceMap;
  });

/**
 * Resolves project media items with their source lineage.
 * Each media item will include a `sources` array showing what it was derived from.
 */
export const resolveProjectMediaWithSources = (items: ProjectMedia[]) =>
  Effect.gen(function* () {
    // First resolve the media items
    const resolved = yield* resolveProjectMedia(items);

    if (resolved.length === 0) {
      return resolved;
    }

    // Fetch sources for all items
    const sourceMap = yield* fetchSourcesForMediaItems(
      resolved.map((item) => ({
        mediaType: item.mediaType,
        mediaId: item.mediaId,
      })),
    );

    // Attach sources to each item
    return resolved.map((item) => ({
      ...item,
      sources: sourceMap.get(`${item.mediaType}:${item.mediaId}`) ?? [],
    }));
  });

/**
 * Verifies that media items exist and are owned by the user.
 * Returns the validated media items or fails with appropriate error.
 *
 * Note: Currently only supports 'document' and 'podcast' types.
 * Other content types will be supported as their tables are created.
 */
export const verifyMediaOwnership = (
  mediaItems: { mediaType: ContentType; mediaId: string }[],
  userId: string,
) =>
  Effect.gen(function* () {
    const grouped = {
      documents: mediaItems.filter((i) => i.mediaType === 'document'),
      podcasts: mediaItems.filter((i) => i.mediaType === 'podcast'),
    };

    // Fetch all referenced media
    const [documents, podcasts] = yield* Effect.all([
      resolveDocuments(grouped.documents.map((i) => i.mediaId)),
      resolvePodcasts(grouped.podcasts.map((i) => i.mediaId)),
    ]);

    // Check for missing documents
    const docIds = new Set(documents.map((d) => d.id));
    const missingDoc = grouped.documents.find((d) => !docIds.has(d.mediaId));
    if (missingDoc) {
      yield* Effect.fail(
        new MediaNotFound({
          mediaType: 'document',
          mediaId: missingDoc.mediaId,
          message: 'Document not found',
        }),
      );
    }

    // Check for missing podcasts
    const podIds = new Set(podcasts.map((p) => p.id));
    const missingPod = grouped.podcasts.find((p) => !podIds.has(p.mediaId));
    if (missingPod) {
      yield* Effect.fail(
        new MediaNotFound({
          mediaType: 'podcast',
          mediaId: missingPod.mediaId,
          message: 'Podcast not found',
        }),
      );
    }

    // Check ownership
    const notOwnedDoc = documents.find((d) => d.createdBy !== userId);
    if (notOwnedDoc) {
      yield* Effect.fail(
        new MediaNotFound({
          mediaType: 'document',
          mediaId: notOwnedDoc.id,
          message: 'Document not found or access denied',
        }),
      );
    }

    const notOwnedPod = podcasts.find((p) => p.createdBy !== userId);
    if (notOwnedPod) {
      yield* Effect.fail(
        new MediaNotFound({
          mediaType: 'podcast',
          mediaId: notOwnedPod.id,
          message: 'Podcast not found or access denied',
        }),
      );
    }

    return { documents, podcasts };
  });
