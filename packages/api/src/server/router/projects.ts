import { Projects } from '@repo/project';
import { Effect } from 'effect';
import { createErrorHandlers, handleEffect } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import {
  serializeProject,
  serializeProjectDocument,
  serializeProjectWithDocuments,
  serializeProjectFull,
} from '../serializers';

const projectRouter = {
  // =========================================================================
  // Core CRUD
  // =========================================================================

  list: protectedProcedure.projects.list.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          const result = yield* projects.list(input);
          return result.map(serializeProject);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          ProjectNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
          DocumentNotFound: (e) => {
            throw errors.NOT_FOUND({ message: e.message });
          },
        },
      );
    },
  ),

  get: protectedProcedure.projects.get.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          return serializeProjectFull(yield* projects.findById(input.id));
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          ProjectNotFound: (e) => {
            throw errors.PROJECT_NOT_FOUND({
              message: e.message ?? `Project ${e.id} not found`,
              data: { projectId: e.id },
            });
          },
          DocumentNotFound: (e) => {
            throw errors.DOCUMENT_NOT_FOUND({
              message: e.message,
              data: { documentId: e.id },
            });
          },
        },
      );
    },
  ),

  create: protectedProcedure.projects.create.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          const result = yield* projects.create(input);
          return serializeProjectWithDocuments(result);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          DocumentNotFound: (e) => {
            throw errors.DOCUMENT_NOT_FOUND({
              message: e.message ?? `Document ${e.id} not found`,
              data: { documentId: e.id },
            });
          },
          ProjectNotFound: (e) => {
            throw errors.PROJECT_NOT_FOUND({
              message: e.message,
              data: { projectId: e.id },
            });
          },
        },
      );
    },
  ),

  update: protectedProcedure.projects.update.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      const { id, ...data } = input;
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          const result = yield* projects.update(id, data);
          return serializeProjectWithDocuments(result);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          ProjectNotFound: (e) => {
            throw errors.PROJECT_NOT_FOUND({
              message: e.message ?? `Project ${e.id} not found`,
              data: { projectId: e.id },
            });
          },
          DocumentNotFound: (e) => {
            throw errors.DOCUMENT_NOT_FOUND({
              message: e.message,
              data: { documentId: e.id },
            });
          },
        },
      );
    },
  ),

  delete: protectedProcedure.projects.delete.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          yield* projects.delete(input.id);
          return {};
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          ProjectNotFound: (e) => {
            throw errors.PROJECT_NOT_FOUND({
              message: e.message ?? `Project ${e.id} not found`,
              data: { projectId: e.id },
            });
          },
          DocumentNotFound: (e) => {
            throw errors.DOCUMENT_NOT_FOUND({
              message: e.message,
              data: { documentId: e.id },
            });
          },
        },
      );
    },
  ),

  // =========================================================================
  // Document Management
  // =========================================================================

  addDocument: protectedProcedure.projects.addDocument.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      const { id, ...docInput } = input;
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          const result = yield* projects.addDocument(id, docInput);
          return serializeProjectDocument(result);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          ProjectNotFound: (e) => {
            throw errors.PROJECT_NOT_FOUND({
              message: e.message ?? `Project ${e.id} not found`,
              data: { projectId: e.id },
            });
          },
          DocumentNotFound: (e) => {
            throw errors.DOCUMENT_NOT_FOUND({
              message: e.message ?? `Document ${e.id} not found`,
              data: { documentId: e.id },
            });
          },
        },
      );
    },
  ),

  removeDocument: protectedProcedure.projects.removeDocument.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          yield* projects.removeDocument(input.id, input.documentId);
          return {};
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          ProjectNotFound: (e) => {
            throw errors.PROJECT_NOT_FOUND({
              message: e.message ?? `Project ${e.id} not found`,
              data: { projectId: e.id },
            });
          },
          DocumentNotFound: (e) => {
            throw errors.DOCUMENT_NOT_FOUND({
              message: e.message,
              data: { documentId: e.id },
            });
          },
        },
      );
    },
  ),

  reorderDocuments: protectedProcedure.projects.reorderDocuments.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const projects = yield* Projects;
          const result = yield* projects.reorderDocuments(
            input.id,
            input.documentIds,
          );
          return result.map(serializeProjectDocument);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          ProjectNotFound: (e) => {
            throw errors.PROJECT_NOT_FOUND({
              message: e.message ?? `Project ${e.id} not found`,
              data: { projectId: e.id },
            });
          },
          DocumentNotFound: (e) => {
            throw errors.DOCUMENT_NOT_FOUND({
              message: e.message,
              data: { documentId: e.id },
            });
          },
        },
      );
    },
  ),
};

export default projectRouter;
