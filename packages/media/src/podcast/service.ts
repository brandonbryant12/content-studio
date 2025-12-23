import { Context } from 'effect';
import type { CurrentUser } from '@repo/auth-policy';
import type {
  Podcast,
  PodcastScript,
  Document,
  CreatePodcast,
  UpdatePodcast,
  UpdateScript,
  PodcastStatus,
} from '@repo/db/schema';
import type { Db, DatabaseError } from '@repo/effect/db';
import type {
  PodcastNotFound,
  ScriptNotFound,
  ForbiddenError,
  PolicyError,
  DocumentNotFound,
} from '@repo/effect/errors';
import type { Effect } from 'effect';

/**
 * Context requirements for podcast service operations.
 */
type PodcastContext = Db | CurrentUser;

/**
 * Podcast with associated source documents.
 */
export interface PodcastWithDocuments extends Podcast {
  documents: Document[];
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
  documents: Document[];
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
   */
  readonly create: (
    data: CreatePodcast,
  ) => Effect.Effect<
    PodcastWithDocuments,
    DatabaseError | PolicyError | ForbiddenError | DocumentNotFound,
    PodcastContext
  >;

  /**
   * Find a podcast by ID.
   */
  readonly findById: (
    id: string,
  ) => Effect.Effect<
    PodcastFull,
    PodcastNotFound | DatabaseError | PolicyError | ForbiddenError,
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
    DatabaseError | PolicyError,
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
    | PodcastNotFound
    | DatabaseError
    | PolicyError
    | ForbiddenError
    | DocumentNotFound,
    PodcastContext
  >;

  /**
   * Delete a podcast and all associated data.
   */
  readonly delete: (
    id: string,
  ) => Effect.Effect<
    void,
    PodcastNotFound | DatabaseError | PolicyError | ForbiddenError,
    PodcastContext
  >;

  /**
   * Get the active script for a podcast.
   */
  readonly getScript: (
    podcastId: string,
  ) => Effect.Effect<
    PodcastScript,
    | PodcastNotFound
    | ScriptNotFound
    | DatabaseError
    | PolicyError
    | ForbiddenError,
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
    PodcastNotFound | DatabaseError | PolicyError | ForbiddenError,
    PodcastContext
  >;

  /**
   * Update podcast status.
   */
  readonly setStatus: (
    id: string,
    status: PodcastStatus,
    errorMessage?: string,
  ) => Effect.Effect<Podcast, PodcastNotFound | DatabaseError, PodcastContext>;

  /**
   * Count podcasts for the current user.
   */
  readonly count: (options?: {
    status?: PodcastStatus;
  }) => Effect.Effect<number, DatabaseError | PolicyError, PodcastContext>;

  /**
   * List all script versions for a podcast.
   */
  readonly listScriptVersions: (
    podcastId: string,
  ) => Effect.Effect<
    readonly ScriptVersionSummary[],
    PodcastNotFound | DatabaseError | PolicyError | ForbiddenError,
    PodcastContext
  >;

  /**
   * Restore a previous script version (creates a new version).
   */
  readonly restoreScriptVersion: (
    podcastId: string,
    scriptId: string,
  ) => Effect.Effect<
    PodcastScript,
    | PodcastNotFound
    | ScriptNotFound
    | DatabaseError
    | PolicyError
    | ForbiddenError,
    PodcastContext
  >;

  /**
   * Get a specific script version by ID.
   */
  readonly getScriptById: (
    podcastId: string,
    scriptId: string,
  ) => Effect.Effect<
    PodcastScript,
    | PodcastNotFound
    | ScriptNotFound
    | DatabaseError
    | PolicyError
    | ForbiddenError,
    PodcastContext
  >;
}

/**
 * Script version summary for history listing.
 */
export interface ScriptVersionSummary {
  id: string;
  version: number;
  isActive: boolean;
  segmentCount: number;
  createdAt: Date;
}

export class Podcasts extends Context.Tag('@repo/media/Podcasts')<
  Podcasts,
  PodcastService
>() {}
