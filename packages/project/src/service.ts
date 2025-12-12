import type { ProjectNotFound } from './repository';
import type {
  CreateProject,
  Project,
  ProjectDocument,
  UpdateProject,
} from '@repo/db/schema';
import type {
  DbError,
  DocumentNotFound,
  PolicyError,
  ForbiddenError,
  MediaNotFound,
} from '@repo/effect/errors';
import type { Effect } from 'effect';
import type {
  ProjectMediaItem,
  ProjectWithMedia,
  AddMediaInput,
} from './types';

/**
 * @deprecated Use ProjectWithMedia instead for polymorphic media support.
 */
export interface ProjectFull extends Project {
  documents: ProjectDocument[];
}

export type ProjectError =
  | DbError
  | ProjectNotFound
  | DocumentNotFound
  | MediaNotFound
  | PolicyError
  | ForbiddenError;

export interface ProjectsService {
  // ==========================================================================
  // Core CRUD (Legacy - returns ProjectFull for backward compatibility)
  // ==========================================================================

  readonly create: (
    input: CreateProject,
  ) => Effect.Effect<ProjectFull, ProjectError, never>;

  readonly list: (options?: {
    limit?: number;
    offset?: number;
  }) => Effect.Effect<Project[], ProjectError, never>;

  readonly findById: (
    id: string,
  ) => Effect.Effect<ProjectFull, ProjectError, never>;

  readonly update: (
    id: string,
    input: UpdateProject,
  ) => Effect.Effect<ProjectFull, ProjectError, never>;

  readonly delete: (id: string) => Effect.Effect<void, ProjectError, never>;

  // ==========================================================================
  // New: Polymorphic Media Management
  // ==========================================================================

  /**
   * Get a project with all resolved media items.
   */
  readonly findByIdWithMedia: (
    id: string,
  ) => Effect.Effect<ProjectWithMedia, ProjectError, never>;

  /**
   * Add a media item (document, podcast, etc.) to a project.
   */
  readonly addMedia: (
    projectId: string,
    input: AddMediaInput,
  ) => Effect.Effect<ProjectMediaItem, ProjectError, never>;

  /**
   * Remove a media item from a project.
   */
  readonly removeMedia: (
    projectId: string,
    mediaId: string,
  ) => Effect.Effect<void, ProjectError, never>;

  /**
   * Reorder media items in a project.
   * Takes an ordered array of media IDs.
   */
  readonly reorderMedia: (
    projectId: string,
    mediaIds: string[],
  ) => Effect.Effect<ProjectMediaItem[], ProjectError, never>;
}
