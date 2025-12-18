import { Documents } from '@repo/media';
import { serializeDocument } from '@repo/db/schema';
import { Effect } from 'effect';
import { createErrorHandlers, handleEffect } from '../effect-handler';
import { protectedProcedure } from '../orpc';

const documentRouter = {
  list: protectedProcedure.documents.list.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const documents = yield* Documents;
          const result = yield* documents.list(input);
          return result.map(serializeDocument);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
        },
      );
    },
  ),

  get: protectedProcedure.documents.get.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const documents = yield* Documents;
          const result = yield* documents.findById(input.id);
          return serializeDocument(result);
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
        },
      );
    },
  ),

  getContent: protectedProcedure.documents.getContent.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const documents = yield* Documents;
          const content = yield* documents.getContent(input.id);
          return { content };
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          ...handlers.storage,
          DocumentNotFound: (e) => {
            throw errors.DOCUMENT_NOT_FOUND({
              message: e.message ?? `Document ${e.id} not found`,
              data: { documentId: e.id },
            });
          },
          DocumentParseError: (e) => {
            throw errors.DOCUMENT_PARSE_ERROR({
              message: e.message ?? 'Failed to parse document content',
              data: { fileName: e.fileName },
            });
          },
        },
      );
    },
  ),

  create: protectedProcedure.documents.create.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const documents = yield* Documents;
          const result = yield* documents.create(input);
          return serializeDocument(result);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          ...handlers.storage,
        },
      );
    },
  ),

  upload: protectedProcedure.documents.upload.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const documents = yield* Documents;

          // Decode base64 to Buffer
          const data = Buffer.from(input.data, 'base64');

          const result = yield* documents.upload({
            fileName: input.fileName,
            mimeType: input.mimeType,
            data,
            title: input.title,
            metadata: input.metadata,
          });

          return serializeDocument(result);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          ...handlers.storage,
          DocumentTooLargeError: (e) => {
            throw errors.DOCUMENT_TOO_LARGE({
              message: e.message,
              data: {
                fileName: e.fileName,
                fileSize: e.fileSize,
                maxSize: e.maxSize,
              },
            });
          },
          UnsupportedDocumentFormat: (e) => {
            throw errors.UNSUPPORTED_FORMAT({
              message: e.message,
              data: {
                fileName: e.fileName,
                mimeType: e.mimeType,
                supportedFormats: [...e.supportedFormats],
              },
            });
          },
          DocumentParseError: (e) => {
            throw errors.DOCUMENT_PARSE_ERROR({
              message: e.message ?? 'Failed to parse document',
              data: { fileName: e.fileName },
            });
          },
        },
      );
    },
  ),

  update: protectedProcedure.documents.update.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      const { id, ...data } = input;

      return handleEffect(
        Effect.gen(function* () {
          const documents = yield* Documents;
          const result = yield* documents.update(id, data);
          return serializeDocument(result);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          ...handlers.storage,
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

  delete: protectedProcedure.documents.delete.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const documents = yield* Documents;
          yield* documents.delete(input.id);
          return {};
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          ...handlers.storage,
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
};

export default documentRouter;
