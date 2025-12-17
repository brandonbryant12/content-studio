import { CurrentUser, requireOwnership } from '@repo/auth-policy';
import { Db } from '@repo/effect/db';
import { Context, Effect, Layer } from 'effect';
import type { ProjectsService } from './service';
import {
  verifyDocumentsExist,
  insertProject,
  listProjects,
  findProjectById,
  updateProject,
  deleteProject,
  insertProjectDocument,
  deleteProjectDocument,
  reorderProjectDocuments,
} from './repository';

export class Projects extends Context.Tag('@repo/project/Projects')<
  Projects,
  ProjectsService
>() {}

export const ProjectsLive = Layer.effect(
  Projects,
  Effect.gen(function* () {
    const db = yield* Db;
    const currentUser = yield* CurrentUser;

    // Helper to provide services to effects
    const provide = <A, E>(effect: Effect.Effect<A, E, Db | CurrentUser>) =>
      effect.pipe(
        Effect.provideService(Db, db),
        Effect.provideService(CurrentUser, currentUser),
      );

    const service: ProjectsService = {
      // =================================================================
      // Core CRUD
      // =================================================================

      create: (input) =>
        Effect.gen(function* () {
          const { documentIds, ...data } = input;

          if (documentIds && documentIds.length > 0) {
            yield* provide(verifyDocumentsExist(documentIds, currentUser.id));
          }

          return yield* provide(
            insertProject(
              {
                ...data,
                createdBy: currentUser.id,
              },
              documentIds ?? [],
            ),
          );
        }),

      list: (options) =>
        provide(
          listProjects({
            ...options,
            createdBy: currentUser.id, // Enforce tenant isolation
          }),
        ),

      findById: (id) =>
        Effect.gen(function* () {
          const project = yield* provide(findProjectById(id));
          yield* provide(requireOwnership(project.createdBy));
          return project;
        }),

      update: (id, input) =>
        Effect.gen(function* () {
          const project = yield* provide(findProjectById(id));
          yield* provide(requireOwnership(project.createdBy));

          if (input.documentIds && input.documentIds.length > 0) {
            yield* provide(
              verifyDocumentsExist(input.documentIds, currentUser.id),
            );
          }

          return yield* provide(updateProject(id, input));
        }),

      delete: (id) =>
        Effect.gen(function* () {
          const project = yield* provide(findProjectById(id));
          yield* provide(requireOwnership(project.createdBy));
          yield* provide(deleteProject(id));
        }),

      // =================================================================
      // Document Management
      // =================================================================

      addDocument: (projectId, input) =>
        Effect.gen(function* () {
          const project = yield* provide(findProjectById(projectId));
          yield* provide(requireOwnership(project.createdBy));

          // Verify document exists and user owns it
          yield* provide(verifyDocumentsExist([input.documentId], currentUser.id));

          return yield* provide(insertProjectDocument(projectId, input));
        }),

      removeDocument: (projectId, documentId) =>
        Effect.gen(function* () {
          const project = yield* provide(findProjectById(projectId));
          yield* provide(requireOwnership(project.createdBy));

          yield* provide(deleteProjectDocument(projectId, documentId));
        }),

      reorderDocuments: (projectId, documentIds) =>
        Effect.gen(function* () {
          const project = yield* provide(findProjectById(projectId));
          yield* provide(requireOwnership(project.createdBy));

          return yield* provide(reorderProjectDocuments(projectId, documentIds));
        }),
    };

    return service;
  }),
);
