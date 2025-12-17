import type { ProjectNotFound } from './repository';
import type {
  CreateProject,
  Project,
  ProjectDocument,
  UpdateProject,
  Document,
} from '@repo/db/schema';
import type {
  DbError,
  DocumentNotFound,
  PolicyError,
  ForbiddenError,
} from '@repo/effect/errors';
import type { Effect } from 'effect';
import type { ProjectWithDocuments, ProjectFull, AddDocumentInput } from './types';

export type ProjectError =
  | DbError
  | ProjectNotFound
  | DocumentNotFound
  | PolicyError
  | ForbiddenError;

export interface ProjectsService {
  // ==========================================================================
  // Core CRUD
  // ==========================================================================

  readonly create: (
    input: CreateProject,
  ) => Effect.Effect<ProjectWithDocuments, ProjectError, never>;

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
  ) => Effect.Effect<ProjectWithDocuments, ProjectError, never>;

  readonly delete: (id: string) => Effect.Effect<void, ProjectError, never>;

  // ==========================================================================
  // Document Management
  // ==========================================================================

  /**
   * Add a document to a project.
   */
  readonly addDocument: (
    projectId: string,
    input: AddDocumentInput,
  ) => Effect.Effect<ProjectDocument, ProjectError, never>;

  /**
   * Remove a document from a project.
   */
  readonly removeDocument: (
    projectId: string,
    documentId: string,
  ) => Effect.Effect<void, ProjectError, never>;

  /**
   * Reorder documents in a project.
   */
  readonly reorderDocuments: (
    projectId: string,
    documentIds: string[],
  ) => Effect.Effect<ProjectDocument[], ProjectError, never>;
}
