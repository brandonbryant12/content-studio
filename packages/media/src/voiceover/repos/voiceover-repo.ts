import { type Db, type DatabaseError } from '@repo/db/effect';
import { type Voiceover, type VoiceoverStatus } from '@repo/db/schema';
import { Context, Layer } from 'effect';
import type { VoiceoverNotFound } from '../../errors';
import type { Effect } from 'effect';
import { voiceoverReadMethods } from './voiceover-repo.reads';
import { voiceoverWriteMethods } from './voiceover-repo.writes';

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
   * Find voiceover by ID scoped to owner.
   * Fails with VoiceoverNotFound for missing or not-owned records.
   */
  readonly findByIdForUser: (
    id: string,
    userId: string,
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

const make: VoiceoverRepoService = {
  ...voiceoverReadMethods,
  ...voiceoverWriteMethods,
};

// =============================================================================
// Layer
// =============================================================================

export const VoiceoverRepoLive: Layer.Layer<VoiceoverRepo> = Layer.succeed(
  VoiceoverRepo,
  make,
);
