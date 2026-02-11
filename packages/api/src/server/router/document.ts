import {
  serializeDocumentEffect,
  serializeDocumentsEffect,
  type Document,
} from '@repo/db/schema';
import {
  listDocuments,
  getDocument,
  getDocumentContent,
  createDocument,
  uploadDocument,
  updateDocument,
  deleteDocument,
  createFromUrl,
  retryProcessing,
} from '@repo/media';
import { Effect } from 'effect';
import { handleEffectWithProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import { tapLogActivity, tapSyncTitle } from './log-activity';

const documentRouter = {
  list: protectedProcedure.documents.list.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listDocuments({
          limit: input.limit,
          offset: input.offset,
          source: input.source,
          status: input.status,
        }).pipe(
          Effect.flatMap((result) =>
            serializeDocumentsEffect(result.documents as readonly Document[]),
          ),
        ),
        errors,
        {
          span: 'api.documents.list',
          attributes: {
            'pagination.limit': input.limit ?? 50,
            'pagination.offset': input.offset ?? 0,
          },
        },
      );
    },
  ),

  get: protectedProcedure.documents.get.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getDocument({ id: input.id }).pipe(
          Effect.flatMap(serializeDocumentEffect),
        ),
        errors,
        {
          span: 'api.documents.get',
          attributes: { 'document.id': input.id },
        },
      );
    },
  ),

  getContent: protectedProcedure.documents.getContent.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getDocumentContent({ id: input.id }),
        errors,
        {
          span: 'api.documents.getContent',
          attributes: { 'document.id': input.id },
        },
      );
    },
  ),

  create: protectedProcedure.documents.create.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createDocument(input).pipe(
          Effect.flatMap(serializeDocumentEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'document'),
        ),
        errors,
        {
          span: 'api.documents.create',
          attributes: { 'document.title': input.title },
        },
      );
    },
  ),

  upload: protectedProcedure.documents.upload.handler(
    async ({ context, input, errors }) => {
      const data = Buffer.from(input.data, 'base64');
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        uploadDocument({
          fileName: input.fileName,
          mimeType: input.mimeType,
          data,
          title: input.title,
          metadata: input.metadata,
        }).pipe(
          Effect.flatMap(serializeDocumentEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'document'),
        ),
        errors,
        {
          span: 'api.documents.upload',
          attributes: {
            'file.name': input.fileName,
            'file.size': data.length,
          },
        },
      );
    },
  ),

  update: protectedProcedure.documents.update.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;

      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        updateDocument({ id, ...data }).pipe(
          Effect.flatMap(serializeDocumentEffect),
          tapSyncTitle(context.runtime, context.user),
        ),
        errors,
        {
          span: 'api.documents.update',
          attributes: { 'document.id': id },
        },
      );
    },
  ),

  delete: protectedProcedure.documents.delete.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        deleteDocument({ id: input.id }).pipe(
          Effect.map(() => ({})),
          tapLogActivity(
            context.runtime,
            context.user,
            'deleted',
            'document',
            input.id,
          ),
        ),
        errors,
        {
          span: 'api.documents.delete',
          attributes: { 'document.id': input.id },
        },
      );
    },
  ),

  fromUrl: protectedProcedure.documents.fromUrl.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createFromUrl(input).pipe(
          Effect.flatMap(serializeDocumentEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'document'),
        ),
        errors,
        {
          span: 'api.documents.fromUrl',
          attributes: { 'document.url': input.url },
        },
      );
    },
  ),

  retry: protectedProcedure.documents.retry.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        retryProcessing({ id: input.id }).pipe(
          Effect.flatMap(serializeDocumentEffect),
        ),
        errors,
        {
          span: 'api.documents.retry',
          attributes: { 'document.id': input.id },
        },
      );
    },
  ),
};

export default documentRouter;
