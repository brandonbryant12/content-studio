import {
  podcast,
  podcastScript,
  document,
  type Podcast,
  type PodcastScript,
  type CreatePodcast,
  type UpdatePodcast,
  type UpdateScript,
  type PodcastStatus,
  type GenerationContext,
  type Document,
} from '@repo/db/schema';
import { withDb } from '@repo/effect/db';
import {
  PodcastNotFound,
  ScriptNotFound,
  DocumentNotFound,
} from '@repo/effect/errors';
import { eq, desc, and, inArray, count as drizzleCount } from 'drizzle-orm';
import { Effect } from 'effect';

/**
 * Podcast with resolved source documents.
 */
export interface PodcastFull extends Podcast {
  documents: Document[];
  script: PodcastScript | null;
}

/**
 * Verify all document IDs exist and are owned by the specified user.
 */
export const verifyDocumentsExist = (documentIds: string[], userId: string) =>
  withDb('podcast.verifyDocuments', async (db) => {
    const docs = await db
      .select({ id: document.id, createdBy: document.createdBy })
      .from(document)
      .where(inArray(document.id, documentIds));

    const foundIds = new Set(docs.map((d) => d.id));
    const missingId = documentIds.find((id) => !foundIds.has(id));

    // Check ownership - all documents must belong to the user
    const notOwned = docs.find((d) => d.createdBy !== userId);

    return { docs, missingId, notOwnedId: notOwned?.id };
  }).pipe(
    Effect.flatMap(({ docs, missingId, notOwnedId }) => {
      if (missingId) {
        return Effect.fail(new DocumentNotFound({ id: missingId }));
      }
      if (notOwnedId) {
        return Effect.fail(
          new DocumentNotFound({
            id: notOwnedId,
            message: 'Document not found or access denied',
          }),
        );
      }
      return Effect.succeed(docs);
    }),
  );

/**
 * Insert a new podcast with source document IDs stored directly.
 */
export const insertPodcast = (
  data: Omit<CreatePodcast, 'documentIds'> & { createdBy: string },
  documentIds: string[],
) =>
  withDb('podcast.insert', async (db) => {
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
        sourceDocumentIds: documentIds,
        createdBy: data.createdBy,
      })
      .returning();

    // Resolve document objects for response
    const docs =
      documentIds.length > 0
        ? await db
            .select()
            .from(document)
            .where(inArray(document.id, documentIds))
        : [];

    // Maintain order based on documentIds array
    const docMap = new Map(docs.map((d) => [d.id, d]));
    const sortedDocs = documentIds
      .map((id) => docMap.get(id))
      .filter((d): d is Document => d !== undefined);

    return { ...pod!, documents: sortedDocs };
  });

/**
 * Find podcast by ID with resolved documents and active script.
 */
export const findPodcastById = (id: string) =>
  withDb('podcast.findById', async (db) => {
    const [pod] = await db
      .select()
      .from(podcast)
      .where(eq(podcast.id, id))
      .limit(1);

    if (!pod) return null;

    // Resolve source documents from the array
    const docs =
      pod.sourceDocumentIds.length > 0
        ? await db
            .select()
            .from(document)
            .where(inArray(document.id, pod.sourceDocumentIds))
        : [];

    // Maintain order based on sourceDocumentIds array
    const docMap = new Map(docs.map((d) => [d.id, d]));
    const sortedDocs = pod.sourceDocumentIds
      .map((id) => docMap.get(id))
      .filter((d): d is Document => d !== undefined);

    const [script] = await db
      .select()
      .from(podcastScript)
      .where(
        and(eq(podcastScript.podcastId, id), eq(podcastScript.isActive, true)),
      )
      .limit(1);

    return { ...pod, documents: sortedDocs, script: script ?? null };
  }).pipe(
    Effect.flatMap((result) =>
      result
        ? Effect.succeed(result)
        : Effect.fail(new PodcastNotFound({ id })),
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
    const { documentIds, ...rest } = data;
    const updateValues: Partial<Podcast> = {
      ...rest,
      updatedAt: new Date(),
    };

    if (documentIds) {
      updateValues.sourceDocumentIds = documentIds;
    }

    const [pod] = await db
      .update(podcast)
      .set(updateValues)
      .where(eq(podcast.id, id))
      .returning();
    return pod;
  }).pipe(
    Effect.flatMap((pod) =>
      pod ? Effect.succeed(pod) : Effect.fail(new PodcastNotFound({ id })),
    ),
  );

/**
 * Update podcast status.
 */
export const updatePodcastStatus = (
  id: string,
  status: PodcastStatus,
  errorMessage?: string,
) =>
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
    Effect.flatMap((pod) =>
      pod ? Effect.succeed(pod) : Effect.fail(new PodcastNotFound({ id })),
    ),
  );

/**
 * Update podcast audio details after generation.
 */
export const updatePodcastAudio = (
  id: string,
  data: { audioUrl: string; duration: number; status: PodcastStatus },
) =>
  withDb('podcast.updateAudio', async (db) => {
    const [pod] = await db
      .update(podcast)
      .set({
        audioUrl: data.audioUrl,
        duration: data.duration,
        status: data.status,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(podcast.id, id))
      .returning();
    return pod;
  }).pipe(
    Effect.flatMap((pod) =>
      pod ? Effect.succeed(pod) : Effect.fail(new PodcastNotFound({ id })),
    ),
  );

/**
 * Delete podcast by ID (cascade deletes scripts).
 */
export const deletePodcast = (id: string) =>
  withDb('podcast.delete', async (db) => {
    const result = await db
      .delete(podcast)
      .where(eq(podcast.id, id))
      .returning({ id: podcast.id });
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
      .where(
        and(
          eq(podcastScript.podcastId, podcastId),
          eq(podcastScript.isActive, true),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]),
  ).pipe(
    Effect.flatMap((script) =>
      script
        ? Effect.succeed(script)
        : Effect.fail(new ScriptNotFound({ podcastId })),
    ),
  );

/**
 * Create or update script (deactivates old versions).
 */
export const upsertScript = (
  podcastId: string,
  data: UpdateScript,
  summary?: string,
  generationPrompt?: string,
) =>
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
        generationPrompt,
      })
      .returning();

    return script!;
  });

/**
 * Update podcast generation context.
 */
export const updatePodcastGenerationContext = (
  id: string,
  generationContext: GenerationContext,
) =>
  withDb('podcast.updateGenerationContext', async (db) => {
    const [pod] = await db
      .update(podcast)
      .set({
        generationContext,
        updatedAt: new Date(),
      })
      .where(eq(podcast.id, id))
      .returning();
    return pod;
  }).pipe(
    Effect.flatMap((pod) =>
      pod ? Effect.succeed(pod) : Effect.fail(new PodcastNotFound({ id })),
    ),
  );

/**
 * Count podcasts with optional filters.
 */
export const countPodcasts = (options?: {
  createdBy?: string;
  status?: PodcastStatus;
}) =>
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

/**
 * Script version summary for version history listing.
 */
export interface ScriptVersionSummary {
  id: string;
  version: number;
  isActive: boolean;
  segmentCount: number;
  createdAt: Date;
}

/**
 * List all script versions for a podcast.
 */
export const listScriptVersions = (podcastId: string) =>
  withDb('podcast.listScriptVersions', async (db) => {
    const scripts = await db
      .select({
        id: podcastScript.id,
        version: podcastScript.version,
        isActive: podcastScript.isActive,
        segments: podcastScript.segments,
        createdAt: podcastScript.createdAt,
      })
      .from(podcastScript)
      .where(eq(podcastScript.podcastId, podcastId))
      .orderBy(desc(podcastScript.version));

    return scripts.map((s) => ({
      id: s.id,
      version: s.version,
      isActive: s.isActive,
      segmentCount: s.segments?.length ?? 0,
      createdAt: s.createdAt,
    }));
  });

/**
 * Get a specific script version by ID.
 */
export const getScriptById = (scriptId: string) =>
  withDb('podcast.getScriptById', (db) =>
    db
      .select()
      .from(podcastScript)
      .where(eq(podcastScript.id, scriptId))
      .limit(1)
      .then((rows) => rows[0]),
  ).pipe(
    Effect.flatMap((script) =>
      script
        ? Effect.succeed(script)
        : Effect.fail(
            new ScriptNotFound({
              podcastId: 'unknown',
              message: 'Script version not found',
            }),
          ),
    ),
  );

/**
 * Restore a script version by copying its segments to a new active version.
 */
export const restoreScriptVersion = (
  podcastId: string,
  sourceScriptId: string,
) =>
  withDb('podcast.restoreScriptVersion', async (db) => {
    // Get the source script
    const [sourceScript] = await db
      .select()
      .from(podcastScript)
      .where(
        and(
          eq(podcastScript.id, sourceScriptId),
          eq(podcastScript.podcastId, podcastId),
        ),
      )
      .limit(1);

    if (!sourceScript) {
      return null;
    }

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

    // Insert new active script with restored segments
    const [restoredScript] = await db
      .insert(podcastScript)
      .values({
        podcastId,
        version: nextVersion,
        isActive: true,
        segments: sourceScript.segments,
        summary: sourceScript.summary,
        generationPrompt: `Restored from version ${sourceScript.version}`,
      })
      .returning();

    return restoredScript;
  }).pipe(
    Effect.flatMap((script) =>
      script
        ? Effect.succeed(script)
        : Effect.fail(
            new ScriptNotFound({
              podcastId,
              message: 'Script version not found',
            }),
          ),
    ),
  );
