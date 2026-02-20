import { type Db, type DatabaseError } from '@repo/db/effect';
import {
  type Podcast,
  type CreatePodcast,
  type UpdatePodcast,
  type GenerationContext,
  type Document,
  type VersionStatus,
  type ScriptSegment,
} from '@repo/db/schema';
import { Context, Layer } from 'effect';
import type { DocumentNotFound, PodcastNotFound } from '../../errors';
import type { Effect } from 'effect';
import { podcastReadMethods } from './podcast-repo.reads';
import { podcastWriteMethods } from './podcast-repo.writes';

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
   * Find podcast by ID with resolved documents scoped to owner.
   * Fails with PodcastNotFound for missing or not-owned records.
   */
  readonly findByIdForUser: (
    id: string,
    userId: string,
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

const make: PodcastRepoService = {
  ...podcastReadMethods,
  ...podcastWriteMethods,
};

// =============================================================================
// Layer
// =============================================================================

export const PodcastRepoLive: Layer.Layer<PodcastRepo> = Layer.succeed(
  PodcastRepo,
  make,
);
