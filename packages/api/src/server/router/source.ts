import {
  serializeSourceEffect,
  serializeSourceListItemsEffect,
} from '@repo/db/schema';
import {
  listSources,
  getSource,
  getSourceContent,
  createSource,
  uploadSource,
  updateSource,
  deleteSource,
  createFromUrl,
  createFromResearch,
  retryProcessing,
} from '@repo/media';
import { Effect } from 'effect';
import { handleEffectWithProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import { tapLogActivity, tapSyncTitle } from './log-activity';

const sourceRouter = {
  list: protectedProcedure.sources.list.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listSources(input).pipe(
          Effect.flatMap((result) =>
            serializeSourceListItemsEffect([...result.sources]),
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

  get: protectedProcedure.sources.get.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getSource({ id: input.id }).pipe(Effect.flatMap(serializeSourceEffect)),
        errors,
        {
          requestId: context.requestId,
          attributes: { 'source.id': input.id },
        },
      );
    },
  ),

  getContent: protectedProcedure.sources.getContent.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getSourceContent({ id: input.id }),
        errors,
        {
          requestId: context.requestId,
          attributes: { 'source.id': input.id },
        },
      );
    },
  ),

  create: protectedProcedure.sources.create.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createSource(input).pipe(
          Effect.flatMap(serializeSourceEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'source'),
        ),
        errors,
        {
          requestId: context.requestId,
          attributes: { 'source.title': input.title },
        },
      );
    },
  ),

  upload: protectedProcedure.sources.upload.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        uploadSource(input).pipe(
          Effect.flatMap(serializeSourceEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'source'),
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

  update: protectedProcedure.sources.update.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;

      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        updateSource({ id, ...data }).pipe(
          Effect.flatMap(serializeSourceEffect),
          tapSyncTitle(context.runtime, context.user),
        ),
        errors,
        {
          requestId: context.requestId,
          attributes: { 'source.id': id },
        },
      );
    },
  ),

  delete: protectedProcedure.sources.delete.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        deleteSource({ id: input.id }).pipe(
          Effect.as({}),
          tapLogActivity(
            context.runtime,
            context.user,
            'deleted',
            'source',
            input.id,
          ),
        ),
        errors,
        {
          requestId: context.requestId,
          attributes: { 'source.id': input.id },
        },
      );
    },
  ),

  fromUrl: protectedProcedure.sources.fromUrl.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createFromUrl(input).pipe(
          Effect.flatMap(serializeSourceEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'source'),
        ),
        errors,
        {
          requestId: context.requestId,
          attributes: { 'source.url': input.url },
        },
      );
    },
  ),

  fromResearch: protectedProcedure.sources.fromResearch.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createFromResearch(input).pipe(
          Effect.flatMap(serializeSourceEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'source'),
        ),
        errors,
        {
          requestId: context.requestId,
          attributes: { 'source.researchQuery': input.query.slice(0, 100) },
        },
      );
    },
  ),

  retry: protectedProcedure.sources.retry.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        retryProcessing({ id: input.id }).pipe(
          Effect.flatMap(serializeSourceEffect),
        ),
        errors,
        {
          requestId: context.requestId,
          attributes: { 'source.id': input.id },
        },
      );
    },
  ),
};

export default sourceRouter;
