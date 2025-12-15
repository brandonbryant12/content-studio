import {
  Projects,
  type ProjectMediaItem,
  type ProjectWithMedia,
  type ProjectWithMediaRecords,
} from '@repo/project';
import type { Project, ProjectMedia } from '@repo/db/schema';
import { Effect } from 'effect';
import { handleEffect } from '../effect-handler';
import { protectedProcedure } from '../orpc';

/* eslint-disable @typescript-eslint/no-explicit-any */
const serializeProject = (project: Project): any => ({
  ...project,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
});

const serializeProjectWithMediaRecords = (
  project: ProjectWithMediaRecords,
): any => ({
  ...project,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
  media: project.media.map((m: ProjectMedia) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  })),
});

const serializeMediaItem = (item: ProjectMediaItem): any => ({
  ...item,
  createdAt: item.createdAt.toISOString(),
  media: {
    ...item.media,
    createdAt: item.media.createdAt.toISOString(),
    updatedAt: item.media.updatedAt.toISOString(),
  },
  // Include source lineage if present
  sources: item.sources ?? [],
});

const serializeProjectWithMedia = (project: ProjectWithMedia): any => ({
  ...project,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
  media: project.media.map(serializeMediaItem),
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// Common error handlers
const commonErrorHandlers = (errors: any) => ({
  DbError: (e: any) => {
    console.error('[DbError]', e.message, e.cause);
    throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
  },
  PolicyError: (e: any) => {
    console.error('[PolicyError]', e.message, e.cause);
    throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
  },
  ForbiddenError: (e: any) => {
    throw errors.FORBIDDEN({ message: e.message });
  },
});

const projectRouter = {
  // =========================================================================
  // Core CRUD
  // =========================================================================

  list: protectedProcedure.projects.list.handler(
    async ({ context, input, errors }) => {
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          const result = yield* projects.list(input);
          return result.map(serializeProject);
        }).pipe(Effect.provide(context.layers)),
        {
          ...commonErrorHandlers(errors),
          ProjectNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
          DocumentNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
          MediaNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
        },
      );
    },
  ),

  get: protectedProcedure.projects.get.handler(
    async ({ context, input, errors }) => {
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          return serializeProjectWithMediaRecords(
            yield* projects.findById(input.id),
          );
        }).pipe(Effect.provide(context.layers)),
        {
          ...commonErrorHandlers(errors),
          ProjectNotFound: (e) => {
            throw errors.PROJECT_NOT_FOUND({
              message: e.message ?? `Project ${e.props.id} not found`,
              data: { projectId: e.props.id },
            });
          },
          DocumentNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
          MediaNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
        },
      );
    },
  ),

  create: protectedProcedure.projects.create.handler(
    async ({ context, input, errors }) => {
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          const result = yield* projects.create(input);
          return serializeProjectWithMediaRecords(result);
        }).pipe(Effect.provide(context.layers)),
        {
          ...commonErrorHandlers(errors),
          DocumentNotFound: (e) => {
            throw errors.DOCUMENT_NOT_FOUND({
              message: e.message ?? `Document ${e.id} not found`,
              data: { documentId: e.id },
            });
          },
          ProjectNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
          MediaNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
        },
      );
    },
  ),

  update: protectedProcedure.projects.update.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          const result = yield* projects.update(id, data);
          return serializeProjectWithMediaRecords(result);
        }).pipe(Effect.provide(context.layers)),
        {
          ...commonErrorHandlers(errors),
          ProjectNotFound: (e) => {
            throw errors.PROJECT_NOT_FOUND({
              message: e.message ?? `Project ${e.props.id} not found`,
              data: { projectId: e.props.id },
            });
          },
          DocumentNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
          MediaNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
        },
      );
    },
  ),

  delete: protectedProcedure.projects.delete.handler(
    async ({ context, input, errors }) => {
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          yield* projects.delete(input.id);
          return {};
        }).pipe(Effect.provide(context.layers)),
        {
          ...commonErrorHandlers(errors),
          ProjectNotFound: (e) => {
            throw errors.PROJECT_NOT_FOUND({
              message: e.message ?? `Project ${e.props.id} not found`,
              data: { projectId: e.props.id },
            });
          },
          DocumentNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
          MediaNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
        },
      );
    },
  ),

  // =========================================================================
  // Polymorphic Media Management
  // =========================================================================

  getWithMedia: protectedProcedure.projects.getWithMedia.handler(
    async ({ context, input, errors }) => {
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          const result = yield* projects.findByIdWithMedia(input.id);
          return serializeProjectWithMedia(result);
        }).pipe(Effect.provide(context.layers)),
        {
          ...commonErrorHandlers(errors),
          ProjectNotFound: (e) => {
            throw errors.PROJECT_NOT_FOUND({
              message: e.message ?? `Project ${e.props.id} not found`,
              data: { projectId: e.props.id },
            });
          },
          DocumentNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
          MediaNotFound: (e) => {
            throw errors.MEDIA_NOT_FOUND({
              message:
                e.message ?? `Media ${e.mediaType}/${e.mediaId} not found`,
              data: { mediaType: e.mediaType, mediaId: e.mediaId },
            });
          },
        },
      );
    },
  ),

  addMedia: protectedProcedure.projects.addMedia.handler(
    async ({ context, input, errors }) => {
      const { id, ...mediaInput } = input;
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          const result = yield* projects.addMedia(id, mediaInput);
          return serializeMediaItem(result);
        }).pipe(Effect.provide(context.layers)),
        {
          ...commonErrorHandlers(errors),
          ProjectNotFound: (e) => {
            throw errors.PROJECT_NOT_FOUND({
              message: e.message ?? `Project ${e.props.id} not found`,
              data: { projectId: e.props.id },
            });
          },
          DocumentNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
          MediaNotFound: (e) => {
            throw errors.MEDIA_NOT_FOUND({
              message:
                e.message ?? `Media ${e.mediaType}/${e.mediaId} not found`,
              data: { mediaType: e.mediaType, mediaId: e.mediaId },
            });
          },
        },
      );
    },
  ),

  removeMedia: protectedProcedure.projects.removeMedia.handler(
    async ({ context, input, errors }) => {
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          yield* projects.removeMedia(input.id, input.mediaId);
          return {};
        }).pipe(Effect.provide(context.layers)),
        {
          ...commonErrorHandlers(errors),
          ProjectNotFound: (e) => {
            throw errors.PROJECT_NOT_FOUND({
              message: e.message ?? `Project ${e.props.id} not found`,
              data: { projectId: e.props.id },
            });
          },
          DocumentNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
          MediaNotFound: (e) => {
            throw errors.MEDIA_NOT_FOUND({
              message:
                e.message ?? `Media ${e.mediaType}/${e.mediaId} not found`,
              data: { mediaType: e.mediaType, mediaId: e.mediaId },
            });
          },
        },
      );
    },
  ),

  reorderMedia: protectedProcedure.projects.reorderMedia.handler(
    async ({ context, input, errors }) => {
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          const result = yield* projects.reorderMedia(input.id, input.mediaIds);
          return result.map(serializeMediaItem);
        }).pipe(Effect.provide(context.layers)),
        {
          ...commonErrorHandlers(errors),
          ProjectNotFound: (e) => {
            throw errors.PROJECT_NOT_FOUND({
              message: e.message ?? `Project ${e.props.id} not found`,
              data: { projectId: e.props.id },
            });
          },
          DocumentNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
          MediaNotFound: (e) => {
            throw errors.MEDIA_NOT_FOUND({
              message:
                e.message ?? `Media ${e.mediaType}/${e.mediaId} not found`,
              data: { mediaType: e.mediaType, mediaId: e.mediaId },
            });
          },
        },
      );
    },
  ),
};

export default projectRouter;
