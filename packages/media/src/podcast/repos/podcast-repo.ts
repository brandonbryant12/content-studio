import { Context, Effect, Layer } from 'effect';
import {
  podcast,
  podcastScript,
  document,
  type Podcast,
  type PodcastScript,
  type CreatePodcast,
  type UpdatePodcast,
  type GenerationContext,
  type Document,
  type ActiveVersionSummary,
  type PodcastId,
  type DocumentId,
} from '@repo/db/schema';
import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import { PodcastNotFound, DocumentNotFound } from '@repo/db/errors';
import { eq, desc, and, inArray, count as drizzleCount } from 'drizzle-orm';

// =============================================================================
// Types
// =============================================================================

/**
 * Podcast with resolved source documents.
 */
export interface PodcastWithDocuments extends Podcast {
  documents: Document[];
}

/**
 * Podcast with resolved documents and active version.
 */
export interface PodcastFull extends PodcastWithDocuments {
  activeVersion: PodcastScript | null;
}

/**
 * Podcast with active version summary for list views.
 */
export interface PodcastWithActiveVersionSummary extends Podcast {
  activeVersion: ActiveVersionSummary | null;
}

// =============================================================================
// Types
// =============================================================================

/**
 * Options for listing podcasts.
 */
export interface ListOptions {
  userId?: string;
  projectId?: string;
  createdBy?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Repository interface for podcast operations.
 * Handles raw database access without business logic.
 * All methods require Db context.
 */
export interface PodcastRepoService {
  /**
   * Insert a new podcast with source document IDs.
   */
  readonly insert: (
    data: Omit<CreatePodcast, 'documentIds'> & { createdBy: string },
    documentIds: readonly string[],
  ) => Effect.Effect<PodcastWithDocuments, DatabaseError | DocumentNotFound, Db>;

  /**
   * Find podcast by ID with resolved documents.
   */
  readonly findById: (
    id: string,
  ) => Effect.Effect<PodcastWithDocuments, PodcastNotFound | DatabaseError, Db>;

  /**
   * Find podcast by ID with resolved documents and active version.
   */
  readonly findByIdFull: (
    id: string,
  ) => Effect.Effect<PodcastFull, PodcastNotFound | DatabaseError, Db>;

  /**
   * Update podcast by ID.
   */
  readonly update: (
    id: string,
    data: UpdatePodcast,
  ) => Effect.Effect<Podcast, PodcastNotFound | DatabaseError, Db>;

  /**
   * Delete podcast by ID (cascade deletes versions).
   */
  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;

  /**
   * List podcasts with optional filters.
   */
  readonly list: (options: ListOptions) => Effect.Effect<readonly Podcast[], DatabaseError, Db>;

  /**
   * List podcasts with active version summary (for list views).
   */
  readonly listWithActiveVersionSummary: (
    options: ListOptions,
  ) => Effect.Effect<readonly PodcastWithActiveVersionSummary[], DatabaseError, Db>;

  /**
   * Count podcasts with optional filters.
   */
  readonly count: (options?: ListOptions) => Effect.Effect<number, DatabaseError, Db>;

  /**
   * Verify all document IDs exist and are owned by the specified user.
   */
  readonly verifyDocumentsExist: (
    documentIds: readonly string[],
    userId: string,
  ) => Effect.Effect<Document[], DatabaseError | DocumentNotFound, Db>;

  /**
   * Update podcast generation context.
   */
  readonly updateGenerationContext: (
    id: string,
    generationContext: GenerationContext,
  ) => Effect.Effect<Podcast, PodcastNotFound | DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class PodcastRepo extends Context.Tag('@repo/media/PodcastRepo')<
  PodcastRepo,
  PodcastRepoService
>() {}

// =============================================================================
// Implementation
// =============================================================================

const make: PodcastRepoService = {
  insert: (data, documentIds) =>
    withDb('podcastRepo.insert', async (db) => {
      const docIds = [...documentIds] as DocumentId[];
      const [pod] = await db
        .insert(podcast)
        .values({
          title: data.title ?? 'Generating...',
          description: data.description,
          format: data.format,
          promptInstructions: data.promptInstructions,
          targetDurationMinutes: data.targetDurationMinutes,
          hostVoice: data.hostVoice,
          hostVoiceName: data.hostVoiceName,
          coHostVoice: data.coHostVoice,
          coHostVoiceName: data.coHostVoiceName,
          sourceDocumentIds: docIds,
          createdBy: data.createdBy,
        })
        .returning();

      const docs =
        docIds.length > 0
          ? await db
              .select()
              .from(document)
              .where(inArray(document.id, docIds))
          : [];

      const docMap = new Map(docs.map((d) => [d.id, d]));
      const sortedDocs = docIds
        .map((id) => docMap.get(id))
        .filter((d): d is Document => d !== undefined);

      return { ...pod!, documents: sortedDocs };
    }),

  findById: (id) =>
    withDb('podcastRepo.findById', async (db) => {
      const [pod] = await db
        .select()
        .from(podcast)
        .where(eq(podcast.id, id as PodcastId))
        .limit(1);

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
        .map((id) => docMap.get(id))
        .filter((d): d is Document => d !== undefined);

      return { ...pod, documents: sortedDocs };
    }).pipe(
      Effect.flatMap((result) =>
        result
          ? Effect.succeed(result)
          : Effect.fail(new PodcastNotFound({ id })),
      ),
    ),

  findByIdFull: (id) =>
    withDb('podcastRepo.findByIdFull', async (db) => {
      const podcastId = id as PodcastId;
      const [pod] = await db
        .select()
        .from(podcast)
        .where(eq(podcast.id, podcastId))
        .limit(1);

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
        .map((id) => docMap.get(id))
        .filter((d): d is Document => d !== undefined);

      const [activeVersion] = await db
        .select()
        .from(podcastScript)
        .where(
          and(
            eq(podcastScript.podcastId, podcastId),
            eq(podcastScript.isActive, true),
          ),
        )
        .limit(1);

      return {
        ...pod,
        documents: sortedDocs,
        activeVersion: activeVersion ?? null,
      };
    }).pipe(
      Effect.flatMap((result) =>
        result
          ? Effect.succeed(result)
          : Effect.fail(new PodcastNotFound({ id })),
      ),
    ),

  update: (id, data) =>
    withDb('podcastRepo.update', async (db) => {
      const { documentIds, tags, ...rest } = data;
      const updateValues: Partial<Podcast> = {
        ...rest,
        updatedAt: new Date(),
      };

      if (documentIds) {
        updateValues.sourceDocumentIds = [...documentIds] as DocumentId[];
      }
      if (tags) {
        updateValues.tags = [...tags];
      }

      const [pod] = await db
        .update(podcast)
        .set(updateValues)
        .where(eq(podcast.id, id as PodcastId))
        .returning();
      return pod;
    }).pipe(
      Effect.flatMap((pod) =>
        pod ? Effect.succeed(pod) : Effect.fail(new PodcastNotFound({ id })),
      ),
    ),

  delete: (id) =>
    withDb('podcastRepo.delete', async (db) => {
      const result = await db
        .delete(podcast)
        .where(eq(podcast.id, id as PodcastId))
        .returning({ id: podcast.id });
      return result.length > 0;
    }),

  list: (options) =>
    withDb('podcastRepo.list', (db) => {
      const conditions = [];
      if (options.createdBy) {
        conditions.push(eq(podcast.createdBy, options.createdBy));
      }

      return db
        .select()
        .from(podcast)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(podcast.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0);
    }),

  listWithActiveVersionSummary: (options) =>
    withDb('podcastRepo.listWithActiveVersionSummary', async (db) => {
      const conditions = [];
      if (options.createdBy) {
        conditions.push(eq(podcast.createdBy, options.createdBy));
      }

      const pods = await db
        .select()
        .from(podcast)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(podcast.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0);

      if (pods.length === 0) {
        return [];
      }

      // Get active versions for all podcasts in one query
      const podcastIds = pods.map((p) => p.id);
      const activeVersions = await db
        .select({
          podcastId: podcastScript.podcastId,
          id: podcastScript.id,
          version: podcastScript.version,
          status: podcastScript.status,
          duration: podcastScript.duration,
        })
        .from(podcastScript)
        .where(
          and(
            inArray(podcastScript.podcastId, podcastIds),
            eq(podcastScript.isActive, true),
          ),
        );

      // Create a map for quick lookup
      const versionMap = new Map(
        activeVersions.map((v) => [
          v.podcastId,
          {
            id: v.id,
            version: v.version,
            status: v.status,
            duration: v.duration,
          },
        ]),
      );

      return pods.map((p) => ({
        ...p,
        activeVersion: versionMap.get(p.id) ?? null,
      }));
    }),

  count: (options) =>
    withDb('podcastRepo.count', async (db) => {
      const conditions = [];
      if (options?.createdBy) {
        conditions.push(eq(podcast.createdBy, options.createdBy));
      }

      const [result] = await db
        .select({ count: drizzleCount() })
        .from(podcast)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      return result?.count ?? 0;
    }),

  verifyDocumentsExist: (documentIds, userId) =>
    withDb('podcastRepo.verifyDocuments', async (db) => {
      const docIds = [...documentIds] as DocumentId[];
      if (docIds.length === 0) {
        return { docs: [] as Document[], missingId: undefined as string | undefined, notOwnedId: undefined as string | undefined };
      }

      const docs = await db
        .select()
        .from(document)
        .where(inArray(document.id, docIds));

      const foundIds = new Set(docs.map((d) => d.id as string));
      const missingId = docIds.find((id) => !foundIds.has(id as string));

      const notOwned = docs.find((d) => d.createdBy !== userId);

      return { docs, missingId: missingId as string | undefined, notOwnedId: notOwned?.id as string | undefined };
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

  updateGenerationContext: (id, generationContext) =>
    withDb('podcastRepo.updateGenerationContext', async (db) => {
      const [pod] = await db
        .update(podcast)
        .set({
          generationContext,
          updatedAt: new Date(),
        })
        .where(eq(podcast.id, id as PodcastId))
        .returning();
      return pod;
    }).pipe(
      Effect.flatMap((pod) =>
        pod ? Effect.succeed(pod) : Effect.fail(new PodcastNotFound({ id })),
      ),
    ),
};

// =============================================================================
// Layer
// =============================================================================

export const PodcastRepoLive: Layer.Layer<PodcastRepo, never, Db> =
  Layer.succeed(PodcastRepo, make);
