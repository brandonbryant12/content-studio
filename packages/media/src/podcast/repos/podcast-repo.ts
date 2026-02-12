import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import {
  podcast,
  document,
  type Podcast,
  type CreatePodcast,
  type UpdatePodcast,
  type GenerationContext,
  type Document,
  type PodcastId,
  type DocumentId,
  type VersionStatus,
  type ScriptSegment,
} from '@repo/db/schema';
import { eq, desc, inArray, count as drizzleCount } from 'drizzle-orm';
import { Context, Effect, Layer } from 'effect';
import { PodcastNotFound, DocumentNotFound } from '../../errors';

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
 * Options for listing podcasts.
 */
export interface ListOptions {
  userId?: string;
  projectId?: string;
  createdBy?: string;
  limit?: number;
  offset?: number;
}

/**
 * Options for updating script content.
 */
export interface UpdateScriptOptions {
  segments?: ScriptSegment[];
  summary?: string;
  generationPrompt?: string;
}

/**
 * Options for updating audio.
 */
export interface UpdateAudioOptions {
  audioUrl: string;
  duration: number;
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
  ) => Effect.Effect<
    PodcastWithDocuments,
    DatabaseError | DocumentNotFound,
    Db
  >;

  /**
   * Find podcast by ID with resolved documents.
   */
  readonly findById: (
    id: string,
  ) => Effect.Effect<PodcastWithDocuments, PodcastNotFound | DatabaseError, Db>;

  /**
   * Update podcast by ID.
   */
  readonly update: (
    id: string,
    data: UpdatePodcast,
  ) => Effect.Effect<Podcast, PodcastNotFound | DatabaseError, Db>;

  /**
   * Delete podcast by ID.
   */
  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;

  /**
   * List podcasts with optional filters.
   */
  readonly list: (
    options: ListOptions,
  ) => Effect.Effect<readonly Podcast[], DatabaseError, Db>;

  /**
   * Count podcasts with optional filters.
   */
  readonly count: (
    options?: ListOptions,
  ) => Effect.Effect<number, DatabaseError, Db>;

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

  /**
   * Update podcast status.
   */
  readonly updateStatus: (
    id: string,
    status: VersionStatus,
    errorMessage?: string,
  ) => Effect.Effect<Podcast, PodcastNotFound | DatabaseError, Db>;

  /**
   * Update script content.
   */
  readonly updateScript: (
    id: string,
    options: UpdateScriptOptions,
  ) => Effect.Effect<Podcast, PodcastNotFound | DatabaseError, Db>;

  /**
   * Update audio after generation.
   */
  readonly updateAudio: (
    id: string,
    options: UpdateAudioOptions,
  ) => Effect.Effect<Podcast, PodcastNotFound | DatabaseError, Db>;

  /**
   * Clear audio for regeneration.
   */
  readonly clearAudio: (
    id: string,
  ) => Effect.Effect<Podcast, PodcastNotFound | DatabaseError, Db>;

  /**
   * Set approval (approvedBy + approvedAt).
   */
  readonly setApproval: (
    id: string,
    approvedBy: string,
  ) => Effect.Effect<Podcast, PodcastNotFound | DatabaseError, Db>;

  /**
   * Clear approval (set approvedBy/approvedAt to null).
   */
  readonly clearApproval: (
    id: string,
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

      return db.transaction(async (tx) => {
        const [pod] = await tx
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
            ? await tx
                .select()
                .from(document)
                .where(inArray(document.id, docIds))
            : [];

        const docMap = new Map(docs.map((d) => [d.id, d]));
        const sortedDocs = docIds
          .map((id) => docMap.get(id))
          .filter((d): d is Document => d !== undefined);

        return { ...pod!, documents: sortedDocs };
      });
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
      const createdBy = options.userId || options.createdBy;

      return db
        .select()
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
      const missingId = docIds.find((id) => !foundIds.has(id as string));

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

  updateStatus: (id, status, errorMessage) =>
    withDb('podcastRepo.updateStatus', async (db) => {
      const [pod] = await db
        .update(podcast)
        .set({
          status,
          errorMessage: errorMessage ?? null,
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

  updateScript: (id, options) =>
    withDb('podcastRepo.updateScript', async (db) => {
      const [pod] = await db
        .update(podcast)
        .set({
          segments: options.segments,
          summary: options.summary,
          generationPrompt: options.generationPrompt,
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

  updateAudio: (id, options) =>
    withDb('podcastRepo.updateAudio', async (db) => {
      const [pod] = await db
        .update(podcast)
        .set({
          audioUrl: options.audioUrl,
          duration: options.duration,
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

  clearAudio: (id) =>
    withDb('podcastRepo.clearAudio', async (db) => {
      const [pod] = await db
        .update(podcast)
        .set({
          audioUrl: null,
          duration: null,
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

  setApproval: (id, approvedBy) =>
    withDb('podcastRepo.setApproval', async (db) => {
      const [pod] = await db
        .update(podcast)
        .set({
          approvedBy,
          approvedAt: new Date(),
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

  clearApproval: (id) =>
    withDb('podcastRepo.clearApproval', async (db) => {
      const [pod] = await db
        .update(podcast)
        .set({
          approvedBy: null,
          approvedAt: null,
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
