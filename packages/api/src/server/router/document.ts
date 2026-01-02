import { serializeDocument } from '@repo/db/schema';
import { Documents } from '@repo/media';
import { Effect } from 'effect';
import { createErrorHandlers, handleEffect, getErrorProp } from '../effect-handler';
import { protectedProcedure } from '../orpc';

const documentRouter = {
  list: protectedProcedure.documents.list.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        context.runtime,
        context.user,
        Effect.gen(function* () {
          const documents = yield* Documents;
          const result = yield* documents.list(input);
          return result.map(serializeDocument);
        }),
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
        context.runtime,
        context.user,
        Effect.gen(function* () {
          const documents = yield* Documents;
          const result = yield* documents.findById(input.id);
          return serializeDocument(result);
        }),
        {
          ...handlers.common,
          ...handlers.database,
          DocumentNotFound: (e: unknown) => {
            const id = getErrorProp(e, 'id', 'unknown');
            const message = getErrorProp<string | undefined>(e, 'message', undefined);
            throw errors.DOCUMENT_NOT_FOUND({
              message: message ?? `Document ${id} not found`,
              data: { documentId: id },
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
        context.runtime,
        context.user,
        Effect.gen(function* () {
          const documents = yield* Documents;
          const content = yield* documents.getContent(input.id);
          return { content };
        }),
        {
          ...handlers.common,
          ...handlers.database,
          ...handlers.storage,
          DocumentNotFound: (e: unknown) => {
            const id = getErrorProp(e, 'id', 'unknown');
            const message = getErrorProp<string | undefined>(e, 'message', undefined);
            throw errors.DOCUMENT_NOT_FOUND({
              message: message ?? `Document ${id} not found`,
              data: { documentId: id },
            });
          },
          DocumentParseError: (e: unknown) => {
            const message = getErrorProp(e, 'message', 'Failed to parse document content');
            const fileName = getErrorProp(e, 'fileName', 'unknown');
            throw errors.DOCUMENT_PARSE_ERROR({
              message,
              data: { fileName },
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
        context.runtime,
        context.user,
        Effect.gen(function* () {
          const documents = yield* Documents;
          const result = yield* documents.create(input);
          return serializeDocument(result);
        }),
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
        context.runtime,
        context.user,
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
        }),
        {
          ...handlers.common,
          ...handlers.database,
          ...handlers.storage,
          DocumentTooLargeError: (e: unknown) => {
            const message = getErrorProp(e, 'message', 'File too large');
            const fileName = getErrorProp(e, 'fileName', 'unknown');
            const fileSize = getErrorProp(e, 'fileSize', 0);
            const maxSize = getErrorProp(e, 'maxSize', 0);
            throw errors.DOCUMENT_TOO_LARGE({
              message,
              data: { fileName, fileSize, maxSize },
            });
          },
          UnsupportedDocumentFormat: (e: unknown) => {
            const message = getErrorProp(e, 'message', 'Unsupported format');
            const fileName = getErrorProp(e, 'fileName', 'unknown');
            const mimeType = getErrorProp(e, 'mimeType', 'unknown');
            const supportedFormats = getErrorProp<readonly string[]>(e, 'supportedFormats', []);
            throw errors.UNSUPPORTED_FORMAT({
              message,
              data: { fileName, mimeType, supportedFormats: [...supportedFormats] },
            });
          },
          DocumentParseError: (e: unknown) => {
            const message = getErrorProp(e, 'message', 'Failed to parse document');
            const fileName = getErrorProp(e, 'fileName', 'unknown');
            throw errors.DOCUMENT_PARSE_ERROR({
              message,
              data: { fileName },
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
        context.runtime,
        context.user,
        Effect.gen(function* () {
          const documents = yield* Documents;
          const result = yield* documents.update(id, data);
          return serializeDocument(result);
        }),
        {
          ...handlers.common,
          ...handlers.database,
          ...handlers.storage,
          DocumentNotFound: (e: unknown) => {
            const docId = getErrorProp(e, 'id', 'unknown');
            const message = getErrorProp<string | undefined>(e, 'message', undefined);
            throw errors.DOCUMENT_NOT_FOUND({
              message: message ?? `Document ${docId} not found`,
              data: { documentId: docId },
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
        context.runtime,
        context.user,
        Effect.gen(function* () {
          const documents = yield* Documents;
          yield* documents.delete(input.id);
          return {};
        }),
        {
          ...handlers.common,
          ...handlers.database,
          ...handlers.storage,
          DocumentNotFound: (e: unknown) => {
            const id = getErrorProp(e, 'id', 'unknown');
            const message = getErrorProp<string | undefined>(e, 'message', undefined);
            throw errors.DOCUMENT_NOT_FOUND({
              message: message ?? `Document ${id} not found`,
              data: { documentId: id },
            });
          },
        },
      );
    },
  ),
};

export default documentRouter;
