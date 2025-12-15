import type { ProjectNotFound } from './repository';
import type {
  CreateProject,
  Project,
  ProjectMedia,
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
 * Project with media items (raw junction records).
 */
export interface ProjectWithMediaRecords extends Project {
  media: ProjectMedia[];
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
  // Core CRUD
  // ==========================================================================

  readonly create: (
    input: CreateProject,
  ) => Effect.Effect<ProjectWithMediaRecords, ProjectError, never>;

  readonly list: (options?: {
    limit?: number;
    offset?: number;
  }) => Effect.Effect<Project[], ProjectError, never>;

  readonly findById: (
    id: string,
  ) => Effect.Effect<ProjectWithMediaRecords, ProjectError, never>;

  readonly update: (
    id: string,
    input: UpdateProject,
  ) => Effect.Effect<ProjectWithMediaRecords, ProjectError, never>;

  readonly delete: (id: string) => Effect.Effect<void, ProjectError, never>;

  // ==========================================================================
  // Polymorphic Media Management
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
