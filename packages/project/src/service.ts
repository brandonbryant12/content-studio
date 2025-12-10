import type { ProjectNotFound } from './repository';
import type { CreateProject, Project, ProjectDocument, UpdateProject } from '@repo/db/schema';
import type { DbError, DocumentNotFound, PolicyError, ForbiddenError } from '@repo/effect/errors';
import type { Effect } from 'effect';

export interface ProjectFull extends Project {
    documents: ProjectDocument[];
}

export type ProjectError =
    | DbError
    | ProjectNotFound
    | DocumentNotFound
    | PolicyError
    | ForbiddenError;

export interface ProjectsService {
    readonly create: (
        input: CreateProject,
    ) => Effect.Effect<ProjectFull, ProjectError, never>;

    readonly list: (options?: {
        limit?: number;
        offset?: number;
    }) => Effect.Effect<Project[], ProjectError, never>;

    readonly findById: (id: string) => Effect.Effect<ProjectFull, ProjectError, never>;

    readonly update: (
        id: string,
        input: UpdateProject,
    ) => Effect.Effect<Project, ProjectError, never>;

    readonly delete: (id: string) => Effect.Effect<void, ProjectError, never>;
}
