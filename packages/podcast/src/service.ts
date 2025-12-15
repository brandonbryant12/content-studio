import { Context } from 'effect';
import type { CurrentUser } from '@repo/auth-policy';
import type {
  Podcast,
  PodcastScript,
  MediaSource,
  CreatePodcast,
  UpdatePodcast,
  UpdateScript,
  PodcastStatus,
} from '@repo/db/schema';
import type { Db } from '@repo/effect/db';
import type {
  DbError,
  PodcastNotFound,
  ScriptNotFound,
  ForbiddenError,
  PolicyError,
  DocumentNotFound,
  ProjectNotFound,
} from '@repo/effect/errors';
import type { Effect } from 'effect';

/**
 * Context requirements for podcast service operations.
 */
type PodcastContext = Db | CurrentUser;

/**
 * Podcast with associated source documents (via mediaSource).
 */
export interface PodcastWithDocuments extends Podcast {
  documents: readonly MediaSource[];
}

/**
 * Podcast with active script.
 */
export interface PodcastWithScript extends Podcast {
  script: PodcastScript | null;
}

/**
 * Full podcast with all relations.
 */
export interface PodcastFull extends Podcast {
  documents: readonly MediaSource[];
  script: PodcastScript | null;
}

/**
 * Podcast service interface.
 *
 * Handles podcast CRUD, script management, and status transitions.
 */
export interface PodcastService {
  /**
   * Create a new podcast with linked documents.
   * Requires a valid projectId - the podcast will belong to that project.
   */
  readonly create: (
    data: CreatePodcast,
  ) => Effect.Effect<
    PodcastWithDocuments,
    DbError | PolicyError | ForbiddenError | DocumentNotFound | ProjectNotFound,
    PodcastContext
  >;

  /**
   * Find a podcast by ID.
   */
  readonly findById: (
    id: string,
  ) => Effect.Effect<
    PodcastFull,
    PodcastNotFound | DbError | PolicyError | ForbiddenError,
    PodcastContext
  >;

  /**
   * List all podcasts for the current user.
   */
  readonly list: (options?: {
    limit?: number;
    offset?: number;
    status?: PodcastStatus;
  }) => Effect.Effect<
    readonly Podcast[],
    DbError | PolicyError,
    PodcastContext
  >;

  /**
   * Update a podcast.
   */
  readonly update: (
    id: string,
    data: UpdatePodcast,
  ) => Effect.Effect<
    Podcast,
    PodcastNotFound | DbError | PolicyError | ForbiddenError,
    PodcastContext
  >;

  /**
   * Delete a podcast and all associated data.
   */
  readonly delete: (
    id: string,
  ) => Effect.Effect<
    void,
    PodcastNotFound | DbError | PolicyError | ForbiddenError,
    PodcastContext
  >;

  /**
   * Get the active script for a podcast.
   */
  readonly getScript: (
    podcastId: string,
  ) => Effect.Effect<
    PodcastScript,
    PodcastNotFound | ScriptNotFound | DbError | PolicyError | ForbiddenError,
    PodcastContext
  >;

  /**
   * Update the script (creates a new version).
   */
  readonly updateScript: (
    podcastId: string,
    data: UpdateScript,
  ) => Effect.Effect<
    PodcastScript,
    PodcastNotFound | DbError | PolicyError | ForbiddenError,
    PodcastContext
  >;

  /**
   * Update podcast status.
   */
  readonly setStatus: (
    id: string,
    status: PodcastStatus,
    errorMessage?: string,
  ) => Effect.Effect<Podcast, PodcastNotFound | DbError, PodcastContext>;

  /**
   * Count podcasts for the current user.
   */
  readonly count: (options?: {
    status?: PodcastStatus;
  }) => Effect.Effect<number, DbError | PolicyError, PodcastContext>;
}

export class Podcasts extends Context.Tag('@repo/podcast/Podcasts')<
  Podcasts,
  PodcastService
>() {}
