import {
  serializeDocumentEffect,
  serializeDocumentListItemsEffect,
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
  createFromResearch,
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
        listDocuments(input).pipe(
          Effect.flatMap((result) =>
            serializeDocumentListItemsEffect([...result.documents]),
          ),
        ),
        errors,
        {
          requestId: context.requestId,
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
          requestId: context.requestId,
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
          requestId: context.requestId,
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
          requestId: context.requestId,
          attributes: { 'document.title': input.title },
        },
      );
    },
  ),

  upload: protectedProcedure.documents.upload.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        uploadDocument(input).pipe(
          Effect.flatMap(serializeDocumentEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'document'),
        ),
        errors,
        {
          requestId: context.requestId,
          attributes: {
            'file.name': input.fileName,
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
          requestId: context.requestId,
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
          requestId: context.requestId,
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
          requestId: context.requestId,
          attributes: { 'document.url': input.url },
        },
      );
    },
  ),

  fromResearch: protectedProcedure.documents.fromResearch.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createFromResearch(input).pipe(
          Effect.flatMap(serializeDocumentEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'document'),
        ),
        errors,
        {
          requestId: context.requestId,
          attributes: { 'document.researchQuery': input.query.slice(0, 100) },
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
          requestId: context.requestId,
          attributes: { 'document.id': input.id },
        },
      );
    },
  ),
};

export default documentRouter;
