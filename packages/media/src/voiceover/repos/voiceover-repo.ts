import { Context, Effect, Layer } from 'effect';
import {
  voiceover,
  type Voiceover,
  type VoiceoverId,
  type VoiceoverStatus,
} from '@repo/db/schema';
import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import { VoiceoverNotFound } from '../../errors';
import { eq, desc, and, count as drizzleCount } from 'drizzle-orm';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for listing voiceovers.
 */
export interface ListOptions {
  userId?: string;
  createdBy?: string;
  limit?: number;
  offset?: number;
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
 * Repository interface for voiceover operations.
 * Handles raw database access without business logic.
 * All methods require Db context.
 */
export interface VoiceoverRepoService {
  /**
   * Insert a new voiceover.
   */
  readonly insert: (data: {
    title: string;
    createdBy: string;
  }) => Effect.Effect<Voiceover, DatabaseError, Db>;

  /**
   * Find voiceover by ID.
   */
  readonly findById: (
    id: string,
  ) => Effect.Effect<Voiceover, VoiceoverNotFound | DatabaseError, Db>;

  /**
   * Update voiceover by ID.
   */
  readonly update: (
    id: string,
    data: {
      title?: string;
      text?: string;
      voice?: string;
      voiceName?: string | null;
    },
  ) => Effect.Effect<Voiceover, VoiceoverNotFound | DatabaseError, Db>;

  /**
   * Delete voiceover by ID.
   */
  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;

  /**
   * List voiceovers with optional filters.
   */
  readonly list: (
    options: ListOptions,
  ) => Effect.Effect<readonly Voiceover[], DatabaseError, Db>;

  /**
   * Count voiceovers with optional filters.
   */
  readonly count: (
    options?: ListOptions,
  ) => Effect.Effect<number, DatabaseError, Db>;

  /**
   * Update voiceover status.
   */
  readonly updateStatus: (
    id: string,
    status: VoiceoverStatus,
    errorMessage?: string,
  ) => Effect.Effect<Voiceover, VoiceoverNotFound | DatabaseError, Db>;

  /**
   * Update audio after generation.
   */
  readonly updateAudio: (
    id: string,
    options: UpdateAudioOptions,
  ) => Effect.Effect<Voiceover, VoiceoverNotFound | DatabaseError, Db>;

  /**
   * Clear audio for regeneration.
   */
  readonly clearAudio: (
    id: string,
  ) => Effect.Effect<Voiceover, VoiceoverNotFound | DatabaseError, Db>;

  /**
   * Set approval (approvedBy + approvedAt).
   */
  readonly setApproval: (
    id: string,
    approvedBy: string,
  ) => Effect.Effect<Voiceover, VoiceoverNotFound | DatabaseError, Db>;

  /**
   * Clear approval (set approvedBy/approvedAt to null).
   */
  readonly clearApproval: (
    id: string,
  ) => Effect.Effect<Voiceover, VoiceoverNotFound | DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class VoiceoverRepo extends Context.Tag('@repo/media/VoiceoverRepo')<
  VoiceoverRepo,
  VoiceoverRepoService
>() {}

// =============================================================================
// Implementation
// =============================================================================

const make: VoiceoverRepoService = {
  insert: (data) =>
    withDb('voiceoverRepo.insert', async (db) => {
      const [vo] = await db
        .insert(voiceover)
        .values({
          title: data.title,
          createdBy: data.createdBy,
        })
        .returning();
      return vo!;
    }),

  findById: (id) =>
    withDb('voiceoverRepo.findById', async (db) => {
      const [vo] = await db
        .select()
        .from(voiceover)
        .where(eq(voiceover.id, id as VoiceoverId))
        .limit(1);
      return vo ?? null;
    }).pipe(
      Effect.flatMap((result) =>
        result
          ? Effect.succeed(result)
          : Effect.fail(new VoiceoverNotFound({ id })),
      ),
    ),

  update: (id, data) =>
    withDb('voiceoverRepo.update', async (db) => {
      const updateValues: Partial<Voiceover> = {
        updatedAt: new Date(),
      };

      if (data.title !== undefined) updateValues.title = data.title;
      if (data.text !== undefined) updateValues.text = data.text;
      if (data.voice !== undefined) updateValues.voice = data.voice;
      if (data.voiceName !== undefined) updateValues.voiceName = data.voiceName;

      const [vo] = await db
        .update(voiceover)
        .set(updateValues)
        .where(eq(voiceover.id, id as VoiceoverId))
        .returning();
      return vo ?? null;
    }).pipe(
      Effect.flatMap((vo) =>
        vo ? Effect.succeed(vo) : Effect.fail(new VoiceoverNotFound({ id })),
      ),
    ),

  delete: (id) =>
    withDb('voiceoverRepo.delete', async (db) => {
      const result = await db
        .delete(voiceover)
        .where(eq(voiceover.id, id as VoiceoverId))
        .returning({ id: voiceover.id });
      return result.length > 0;
    }),

  list: (options) =>
    withDb('voiceoverRepo.list', (db) => {
      const conditions = [];

      if (options.userId) {
        conditions.push(eq(voiceover.createdBy, options.userId));
      }

      if (options.createdBy && !options.userId) {
        conditions.push(eq(voiceover.createdBy, options.createdBy));
      }

      return db
        .select()
        .from(voiceover)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(voiceover.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0);
    }),

  count: (options) =>
    withDb('voiceoverRepo.count', async (db) => {
      const conditions = [];

      if (options?.userId) {
        conditions.push(eq(voiceover.createdBy, options.userId));
      }

      if (options?.createdBy && !options.userId) {
        conditions.push(eq(voiceover.createdBy, options.createdBy));
      }

      const [result] = await db
        .select({ count: drizzleCount() })
        .from(voiceover)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      return result?.count ?? 0;
    }),

  updateStatus: (id, status, errorMessage) =>
    withDb('voiceoverRepo.updateStatus', async (db) => {
      const [vo] = await db
        .update(voiceover)
        .set({
          status,
          errorMessage: errorMessage ?? null,
          updatedAt: new Date(),
        })
        .where(eq(voiceover.id, id as VoiceoverId))
        .returning();
      return vo ?? null;
    }).pipe(
      Effect.flatMap((vo) =>
        vo ? Effect.succeed(vo) : Effect.fail(new VoiceoverNotFound({ id })),
      ),
    ),

  updateAudio: (id, options) =>
    withDb('voiceoverRepo.updateAudio', async (db) => {
      const [vo] = await db
        .update(voiceover)
        .set({
          audioUrl: options.audioUrl,
          duration: options.duration,
          updatedAt: new Date(),
        })
        .where(eq(voiceover.id, id as VoiceoverId))
        .returning();
      return vo ?? null;
    }).pipe(
      Effect.flatMap((vo) =>
        vo ? Effect.succeed(vo) : Effect.fail(new VoiceoverNotFound({ id })),
      ),
    ),

  clearAudio: (id) =>
    withDb('voiceoverRepo.clearAudio', async (db) => {
      const [vo] = await db
        .update(voiceover)
        .set({
          audioUrl: null,
          duration: null,
          updatedAt: new Date(),
        })
        .where(eq(voiceover.id, id as VoiceoverId))
        .returning();
      return vo ?? null;
    }).pipe(
      Effect.flatMap((vo) =>
        vo ? Effect.succeed(vo) : Effect.fail(new VoiceoverNotFound({ id })),
      ),
    ),

  setApproval: (id, approvedBy) =>
    withDb('voiceoverRepo.setApproval', async (db) => {
      const [vo] = await db
        .update(voiceover)
        .set({
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(voiceover.id, id as VoiceoverId))
        .returning();
      return vo ?? null;
    }).pipe(
      Effect.flatMap((vo) =>
        vo ? Effect.succeed(vo) : Effect.fail(new VoiceoverNotFound({ id })),
      ),
    ),

  clearApproval: (id) =>
    withDb('voiceoverRepo.clearApproval', async (db) => {
      const [vo] = await db
        .update(voiceover)
        .set({
          approvedBy: null,
          approvedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(voiceover.id, id as VoiceoverId))
        .returning();
      return vo ?? null;
    }).pipe(
      Effect.flatMap((vo) =>
        vo ? Effect.succeed(vo) : Effect.fail(new VoiceoverNotFound({ id })),
      ),
    ),
};

// =============================================================================
// Layer
// =============================================================================

export const VoiceoverRepoLive: Layer.Layer<VoiceoverRepo, never, Db> =
  Layer.succeed(VoiceoverRepo, make);
