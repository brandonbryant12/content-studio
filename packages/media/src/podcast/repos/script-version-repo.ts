import { Context, Effect, Layer } from 'effect';
import { podcastScript, type PodcastScript, type ScriptSegment } from '@repo/db/schema';
import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import { ScriptNotFound } from '@repo/db/errors';
import { eq, desc, and } from 'drizzle-orm';

/**
 * Version status type.
 */
export type VersionStatus = PodcastScript['status'];

// =============================================================================
// Types
// =============================================================================

/**
 * Input for creating a new script version.
 */
export interface CreateScriptVersion {
  podcastId: string;
  status: VersionStatus;
  segments?: ScriptSegment[] | null;
  summary?: string | null;
  generationPrompt?: string | null;
}

/**
 * Input for updating a script version.
 */
export interface UpdateScriptVersion {
  status?: VersionStatus;
  segments?: ScriptSegment[] | null;
  summary?: string | null;
  audioUrl?: string | null;
  duration?: number | null;
  errorMessage?: string | null;
  generationPrompt?: string | null;
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Repository interface for script version operations.
 * All methods require Db context.
 */
export interface ScriptVersionRepoService {
  /**
   * Insert a new script version.
   * Automatically increments version number and sets as active.
   */
  readonly insert: (
    data: CreateScriptVersion,
  ) => Effect.Effect<PodcastScript, DatabaseError, Db>;

  /**
   * Find script version by ID.
   */
  readonly findById: (
    id: string,
  ) => Effect.Effect<PodcastScript, ScriptNotFound | DatabaseError, Db>;

  /**
   * Find active version for a podcast.
   * Returns null if no active version exists.
   */
  readonly findActiveByPodcastId: (
    podcastId: string,
  ) => Effect.Effect<PodcastScript | null, DatabaseError, Db>;

  /**
   * Update script version by ID.
   */
  readonly update: (
    id: string,
    data: UpdateScriptVersion,
  ) => Effect.Effect<PodcastScript, ScriptNotFound | DatabaseError, Db>;

  /**
   * Update version status with optional error message.
   */
  readonly updateStatus: (
    id: string,
    status: VersionStatus,
    errorMessage?: string,
  ) => Effect.Effect<PodcastScript, ScriptNotFound | DatabaseError, Db>;

  /**
   * Deactivate all versions for a podcast.
   */
  readonly deactivateAll: (
    podcastId: string,
  ) => Effect.Effect<void, DatabaseError, Db>;

  /**
   * Get the next version number for a podcast.
   */
  readonly getNextVersion: (
    podcastId: string,
  ) => Effect.Effect<number, DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class ScriptVersionRepo extends Context.Tag(
  '@repo/media/ScriptVersionRepo',
)<ScriptVersionRepo, ScriptVersionRepoService>() {}

// =============================================================================
// Implementation
// =============================================================================

const make: ScriptVersionRepoService = {
  insert: (data) =>
    withDb('scriptVersionRepo.insert', async (db) => {
      // Get current max version
      const [current] = await db
        .select({ version: podcastScript.version })
        .from(podcastScript)
        .where(eq(podcastScript.podcastId, data.podcastId))
        .orderBy(desc(podcastScript.version))
        .limit(1);

      const nextVersion = (current?.version ?? 0) + 1;

      // Deactivate all existing versions
      await db
        .update(podcastScript)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(podcastScript.podcastId, data.podcastId));

      // Insert new active version
      const [script] = await db
        .insert(podcastScript)
        .values({
          podcastId: data.podcastId,
          version: nextVersion,
          isActive: true,
          status: data.status,
          segments: data.segments ?? null,
          summary: data.summary ?? null,
          generationPrompt: data.generationPrompt ?? null,
        })
        .returning();

      return script!;
    }),

  findById: (id) =>
    withDb('scriptVersionRepo.findById', (db) =>
      db
        .select()
        .from(podcastScript)
        .where(eq(podcastScript.id, id))
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
    ),

  findActiveByPodcastId: (podcastId) =>
    withDb('scriptVersionRepo.findActive', (db) =>
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
        .then((rows) => rows[0] ?? null),
    ),

  update: (id, data) =>
    withDb('scriptVersionRepo.update', async (db) => {
      const [script] = await db
        .update(podcastScript)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(podcastScript.id, id))
        .returning();
      return script;
    }).pipe(
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
    ),

  updateStatus: (id, status, errorMessage) =>
    withDb('scriptVersionRepo.updateStatus', async (db) => {
      const [script] = await db
        .update(podcastScript)
        .set({
          status,
          errorMessage: errorMessage ?? null,
          updatedAt: new Date(),
        })
        .where(eq(podcastScript.id, id))
        .returning();
      return script;
    }).pipe(
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
    ),

  deactivateAll: (podcastId) =>
    withDb('scriptVersionRepo.deactivateAll', async (db) => {
      await db
        .update(podcastScript)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(podcastScript.podcastId, podcastId));
    }),

  getNextVersion: (podcastId) =>
    withDb('scriptVersionRepo.getNextVersion', async (db) => {
      const [current] = await db
        .select({ version: podcastScript.version })
        .from(podcastScript)
        .where(eq(podcastScript.podcastId, podcastId))
        .orderBy(desc(podcastScript.version))
        .limit(1);

      return (current?.version ?? 0) + 1;
    }),
};

// =============================================================================
// Layer
// =============================================================================

export const ScriptVersionRepoLive: Layer.Layer<ScriptVersionRepo, never, Db> =
  Layer.succeed(ScriptVersionRepo, make);
