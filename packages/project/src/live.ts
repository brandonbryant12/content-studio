import { CurrentUser, requireOwnership } from '@repo/auth-policy';
import { Db } from '@repo/effect/db';
import { Context, Effect, Layer } from 'effect';
import type { ProjectsService } from './service';
import type { ProjectWithMedia } from './types';
import {
  verifyDocumentsExistForProject,
  insertProject,
  listProjects,
  findProjectById,
  updateProject,
  deleteProject,
  findProjectMediaByProjectId,
  insertProjectMedia,
  deleteProjectMedia,
  reorderProjectMedia,
} from './repository';
import { resolveProjectMedia, verifyMediaOwnership } from './media-resolver';

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
      // Core CRUD (Legacy)
      // =================================================================

      create: (input) =>
        Effect.gen(function* () {
          const { documentIds, ...data } = input;

          if (documentIds && documentIds.length > 0) {
            yield* provide(
              verifyDocumentsExistForProject(documentIds, currentUser.id),
            );
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
              verifyDocumentsExistForProject(input.documentIds, currentUser.id),
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
      // Polymorphic Media Management
      // =================================================================

      findByIdWithMedia: (id) =>
        Effect.gen(function* () {
          const project = yield* provide(findProjectById(id));
          yield* provide(requireOwnership(project.createdBy));

          // Get media items from junction table
          const mediaRecords = yield* provide(findProjectMediaByProjectId(id));

          // Resolve media items to full objects
          const media = yield* provide(resolveProjectMedia(mediaRecords));

          const result: ProjectWithMedia = {
            ...project,
            media,
          };
          return result;
        }),

      addMedia: (projectId, input) =>
        Effect.gen(function* () {
          const project = yield* provide(findProjectById(projectId));
          yield* provide(requireOwnership(project.createdBy));

          // Verify media exists and user owns it
          yield* provide(
            verifyMediaOwnership(
              [{ mediaType: input.mediaType, mediaId: input.mediaId }],
              currentUser.id,
            ),
          );

          // Insert media link
          const mediaRecord = yield* provide(
            insertProjectMedia(projectId, input),
          );

          // Resolve the single item
          const [resolved] = yield* provide(resolveProjectMedia([mediaRecord]));
          return resolved!;
        }),

      removeMedia: (projectId, mediaId) =>
        Effect.gen(function* () {
          const project = yield* provide(findProjectById(projectId));
          yield* provide(requireOwnership(project.createdBy));

          yield* provide(deleteProjectMedia(projectId, mediaId));
        }),

      reorderMedia: (projectId, mediaIds) =>
        Effect.gen(function* () {
          const project = yield* provide(findProjectById(projectId));
          yield* provide(requireOwnership(project.createdBy));

          const mediaRecords = yield* provide(
            reorderProjectMedia(projectId, mediaIds),
          );
          return yield* provide(resolveProjectMedia(mediaRecords));
        }),
    };

    return service;
  }),
);
