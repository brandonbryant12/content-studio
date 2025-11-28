import { Effect } from 'effect';
import { eq, desc, and, inArray, count as drizzleCount, sql } from 'drizzle-orm';
import { withDb } from '@repo/effect/db';
import { PodcastNotFound, ScriptNotFound, DocumentNotFound } from '@repo/effect/errors';
import {
  podcast,
  podcastDocument,
  podcastScript,
  document,
  type Podcast,
  type PodcastDocument,
  type PodcastScript,
  type CreatePodcast,
  type UpdatePodcast,
  type UpdateScript,
  type PodcastStatus,
} from '@repo/db/schema';

/**
 * Verify all document IDs exist and return them.
 */
export const verifyDocumentsExist = (documentIds: string[]) =>
  withDb('podcast.verifyDocuments', async (db) => {
    const docs = await db
      .select({ id: document.id })
      .from(document)
      .where(inArray(document.id, documentIds));

    const foundIds = new Set(docs.map((d) => d.id));
    const missingId = documentIds.find((id) => !foundIds.has(id));

    return { docs, missingId };
  }).pipe(
    Effect.flatMap(({ docs, missingId }) =>
      missingId
        ? Effect.fail(new DocumentNotFound({ id: missingId }))
        : Effect.succeed(docs),
    ),
  );

/**
 * Insert a new podcast with document links.
 * Returns the podcast with documents spread into a single object (PodcastWithDocuments shape).
 */
export const insertPodcast = (
  data: Omit<CreatePodcast, 'documentIds'> & { createdBy: string },
  documentIds: string[],
) =>
  withDb('podcast.insert', async (db) => {
    // Insert podcast
    const [pod] = await db
      .insert(podcast)
      .values({
        title: data.title,
        description: data.description,
        format: data.format,
        promptInstructions: data.promptInstructions,
        targetDurationMinutes: data.targetDurationMinutes,
        hostVoice: data.hostVoice,
        hostVoiceName: data.hostVoiceName,
        coHostVoice: data.coHostVoice,
        coHostVoiceName: data.coHostVoiceName,
        createdBy: data.createdBy,
      })
      .returning();

    // Insert document links
    const docLinks = await db
      .insert(podcastDocument)
      .values(
        documentIds.map((documentId, index) => ({
          podcastId: pod!.id,
          documentId,
          order: index,
        })),
      )
      .returning();

    // Spread podcast and add documents array for PodcastWithDocuments shape
    return { ...pod!, documents: docLinks };
  });

/**
 * Find podcast by ID with documents and active script.
 */
export const findPodcastById = (id: string) =>
  withDb('podcast.findById', async (db) => {
    const [pod] = await db.select().from(podcast).where(eq(podcast.id, id)).limit(1);

    if (!pod) return null;

    const docs = await db
      .select()
      .from(podcastDocument)
      .where(eq(podcastDocument.podcastId, id))
      .orderBy(podcastDocument.order);

    const [script] = await db
      .select()
      .from(podcastScript)
      .where(and(eq(podcastScript.podcastId, id), eq(podcastScript.isActive, true)))
      .limit(1);

    return { ...pod, documents: docs, script: script ?? null };
  }).pipe(
    Effect.flatMap((result) =>
      result ? Effect.succeed(result) : Effect.fail(new PodcastNotFound({ id })),
    ),
  );

/**
 * List podcasts with optional filters.
 */
export const listPodcasts = (options: {
  createdBy?: string;
  status?: PodcastStatus;
  limit?: number;
  offset?: number;
}) =>
  withDb('podcast.list', (db) => {
    const conditions = [];
    if (options.createdBy) {
      conditions.push(eq(podcast.createdBy, options.createdBy));
    }
    if (options.status) {
      conditions.push(eq(podcast.status, options.status));
    }

    return db
      .select()
      .from(podcast)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(podcast.createdAt))
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0);
  });

/**
 * Update podcast by ID.
 */
export const updatePodcast = (id: string, data: UpdatePodcast) =>
  withDb('podcast.update', async (db) => {
    const [pod] = await db
      .update(podcast)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(podcast.id, id))
      .returning();
    return pod;
  }).pipe(
    Effect.flatMap((pod) => (pod ? Effect.succeed(pod) : Effect.fail(new PodcastNotFound({ id })))),
  );

/**
 * Update podcast status.
 */
export const updatePodcastStatus = (id: string, status: PodcastStatus, errorMessage?: string) =>
  withDb('podcast.updateStatus', async (db) => {
    const [pod] = await db
      .update(podcast)
      .set({
        status,
        errorMessage: errorMessage ?? null,
        updatedAt: new Date(),
      })
      .where(eq(podcast.id, id))
      .returning();
    return pod;
  }).pipe(
    Effect.flatMap((pod) => (pod ? Effect.succeed(pod) : Effect.fail(new PodcastNotFound({ id })))),
  );

/**
 * Delete podcast by ID (cascade deletes documents and scripts).
 */
export const deletePodcast = (id: string) =>
  withDb('podcast.delete', async (db) => {
    const result = await db.delete(podcast).where(eq(podcast.id, id)).returning({ id: podcast.id });
    return result.length > 0;
  });

/**
 * Get active script for a podcast.
 */
export const getActiveScript = (podcastId: string) =>
  withDb('podcast.getScript', (db) =>
    db
      .select()
      .from(podcastScript)
      .where(and(eq(podcastScript.podcastId, podcastId), eq(podcastScript.isActive, true)))
      .limit(1)
      .then((rows) => rows[0]),
  ).pipe(
    Effect.flatMap((script) =>
      script ? Effect.succeed(script) : Effect.fail(new ScriptNotFound({ podcastId })),
    ),
  );

/**
 * Create or update script (deactivates old versions).
 */
export const upsertScript = (podcastId: string, data: UpdateScript, summary?: string) =>
  withDb('podcast.upsertScript', async (db) => {
    // Get current max version
    const [current] = await db
      .select({ version: podcastScript.version })
      .from(podcastScript)
      .where(eq(podcastScript.podcastId, podcastId))
      .orderBy(desc(podcastScript.version))
      .limit(1);

    const nextVersion = (current?.version ?? 0) + 1;

    // Deactivate all existing scripts
    await db
      .update(podcastScript)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(podcastScript.podcastId, podcastId));

    // Insert new active script
    const [script] = await db
      .insert(podcastScript)
      .values({
        podcastId,
        version: nextVersion,
        isActive: true,
        segments: data.segments,
        summary,
      })
      .returning();

    return script!;
  });

/**
 * Count podcasts with optional filters.
 */
export const countPodcasts = (options?: { createdBy?: string; status?: PodcastStatus }) =>
  withDb('podcast.count', async (db) => {
    const conditions = [];
    if (options?.createdBy) {
      conditions.push(eq(podcast.createdBy, options.createdBy));
    }
    if (options?.status) {
      conditions.push(eq(podcast.status, options.status));
    }

    const [result] = await db
      .select({ count: drizzleCount() })
      .from(podcast)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return result?.count ?? 0;
  });
