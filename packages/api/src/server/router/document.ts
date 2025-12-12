import { Documents } from '@repo/documents';
import { Effect } from 'effect';
import { handleEffect } from '../effect-handler';
import { protectedProcedure } from '../orpc';

/**
 * Serialize Date fields to ISO strings for API output.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const serializeDocument = (doc: any): any => ({
  ...doc,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

/* eslint-enable @typescript-eslint/no-explicit-any */

const documentRouter = {
  list: protectedProcedure.documents.list.handler(
    async ({ context, input, errors }) => {
      return handleEffect(
        Effect.gen(function* () {
          const documents = yield* Documents;
          const result = yield* documents.list(input);
          return result.map(serializeDocument);
        }).pipe(Effect.provide(context.layers)),
        {
          DbError: (e) => {
            console.error('[DbError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Database operation failed',
            });
          },
          PolicyError: (e) => {
            console.error('[PolicyError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Authorization check failed',
            });
          },
        },
      );
    },
  ),

  get: protectedProcedure.documents.get.handler(
    async ({ context, input, errors }) => {
      return handleEffect(
        Effect.gen(function* () {
          const documents = yield* Documents;
          const result = yield* documents.findById(input.id);
          return serializeDocument(result);
        }).pipe(Effect.provide(context.layers)),
        {
          DocumentNotFound: (e) => {
            throw errors.DOCUMENT_NOT_FOUND({
              message: e.message ?? `Document ${e.id} not found`,
              data: { documentId: e.id },
            });
          },
          DbError: (e) => {
            console.error('[DbError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Database operation failed',
            });
          },
          PolicyError: (e) => {
            console.error('[PolicyError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Authorization check failed',
            });
          },
          ForbiddenError: (e) => {
            throw errors.FORBIDDEN({ message: e.message });
          },
        },
      );
    },
  ),

  getContent: protectedProcedure.documents.getContent.handler(
    async ({ context, input, errors }) => {
      return handleEffect(
        Effect.gen(function* () {
          const documents = yield* Documents;
          const content = yield* documents.getContent(input.id);
          return { content };
        }).pipe(Effect.provide(context.layers)),
        {
          DocumentNotFound: (e) => {
            throw errors.DOCUMENT_NOT_FOUND({
              message: e.message ?? `Document ${e.id} not found`,
              data: { documentId: e.id },
            });
          },
          DbError: (e) => {
            console.error('[DbError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Database operation failed',
            });
          },
          PolicyError: (e) => {
            console.error('[PolicyError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Authorization check failed',
            });
          },
          ForbiddenError: (e) => {
            throw errors.FORBIDDEN({ message: e.message });
          },
          StorageError: (e) => {
            console.error('[StorageError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Failed to retrieve document content',
            });
          },
          StorageNotFoundError: (e) => {
            console.error('[StorageNotFoundError]', e.message);
            throw errors.DOCUMENT_NOT_FOUND({
              message: 'Document content not found in storage',
              data: { documentId: input.id },
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
      return handleEffect(
        Effect.gen(function* () {
          const documents = yield* Documents;
          const result = yield* documents.create(input);
          return serializeDocument(result);
        }).pipe(Effect.provide(context.layers)),
        {
          DbError: (e) => {
            console.error('[DbError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Database operation failed',
            });
          },
          PolicyError: (e) => {
            console.error('[PolicyError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Authorization check failed',
            });
          },
          ForbiddenError: (e) => {
            throw errors.FORBIDDEN({ message: e.message });
          },
          StorageUploadError: (e) => {
            console.error('[StorageUploadError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Failed to store document content',
            });
          },
        },
      );
    },
  ),

  upload: protectedProcedure.documents.upload.handler(
    async ({ context, input, errors }) => {
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
          DbError: (e) => {
            console.error('[DbError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Database operation failed',
            });
          },
          PolicyError: (e) => {
            console.error('[PolicyError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Authorization check failed',
            });
          },
          ForbiddenError: (e) => {
            throw errors.FORBIDDEN({ message: e.message });
          },
          StorageUploadError: (e) => {
            console.error('[StorageUploadError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Failed to store document',
            });
          },
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
      const { id, ...data } = input;

      return handleEffect(
        Effect.gen(function* () {
          const documents = yield* Documents;
          const result = yield* documents.update(id, data);
          return serializeDocument(result);
        }).pipe(Effect.provide(context.layers)),
        {
          DocumentNotFound: (e) => {
            throw errors.DOCUMENT_NOT_FOUND({
              message: e.message ?? `Document ${e.id} not found`,
              data: { documentId: e.id },
            });
          },
          DbError: (e) => {
            console.error('[DbError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Database operation failed',
            });
          },
          PolicyError: (e) => {
            console.error('[PolicyError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Authorization check failed',
            });
          },
          ForbiddenError: (e) => {
            throw errors.FORBIDDEN({ message: e.message });
          },
          StorageUploadError: (e) => {
            console.error('[StorageUploadError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Failed to update document content',
            });
          },
          StorageError: (e) => {
            console.error('[StorageError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Storage operation failed',
            });
          },
        },
      );
    },
  ),

  delete: protectedProcedure.documents.delete.handler(
    async ({ context, input, errors }) => {
      return handleEffect(
        Effect.gen(function* () {
          const documents = yield* Documents;
          yield* documents.delete(input.id);
          return {};
        }).pipe(Effect.provide(context.layers)),
        {
          DocumentNotFound: (e) => {
            throw errors.DOCUMENT_NOT_FOUND({
              message: e.message ?? `Document ${e.id} not found`,
              data: { documentId: e.id },
            });
          },
          DbError: (e) => {
            console.error('[DbError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Database operation failed',
            });
          },
          PolicyError: (e) => {
            console.error('[PolicyError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Authorization check failed',
            });
          },
          ForbiddenError: (e) => {
            throw errors.FORBIDDEN({ message: e.message });
          },
          StorageError: (e) => {
            console.error('[StorageError]', e.message, e.cause);
            throw errors.INTERNAL_ERROR({
              message: 'Failed to delete document from storage',
            });
          },
        },
      );
    },
  ),
};

export default documentRouter;
