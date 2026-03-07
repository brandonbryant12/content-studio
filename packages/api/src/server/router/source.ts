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
import { bindEffectProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import { tapLogActivity, tapSyncTitle } from './log-activity';

const sourceRouter = {
  list: protectedProcedure.sources.list.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        listSources(input).pipe(
          Effect.flatMap((result) =>
            serializeSourceListItemsEffect([...result.sources]),
          ),
        ),
        {
          attributes: {
            'pagination.limit': input.limit ?? 50,
            'pagination.offset': input.offset ?? 0,
          },
        },
      ),
  ),

  get: protectedProcedure.sources.get.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        getSource({ id: input.id }).pipe(Effect.flatMap(serializeSourceEffect)),
        {
          attributes: { 'source.id': input.id },
        },
      ),
  ),

  getContent: protectedProcedure.sources.getContent.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        getSourceContent({ id: input.id }),
        {
          attributes: { 'source.id': input.id },
        },
      ),
  ),

  create: protectedProcedure.sources.create.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        createSource(input).pipe(
          Effect.flatMap(serializeSourceEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'source'),
        ),
        {
          attributes: { 'source.title': input.title },
        },
      ),
  ),

  upload: protectedProcedure.sources.upload.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        uploadSource(input).pipe(
          Effect.flatMap(serializeSourceEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'source'),
        ),
        {
          attributes: {
            'file.name': input.fileName,
          },
        },
      ),
  ),

  update: protectedProcedure.sources.update.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;

      return bindEffectProtocol({ context, errors }).run(
        updateSource({ id, ...data }).pipe(
          Effect.flatMap(serializeSourceEffect),
          tapSyncTitle(context.runtime, context.user),
        ),
        {
          attributes: { 'source.id': id },
        },
      );
    },
  ),

  delete: protectedProcedure.sources.delete.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
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
        {
          attributes: { 'source.id': input.id },
        },
      ),
  ),

  fromUrl: protectedProcedure.sources.fromUrl.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        createFromUrl(input).pipe(
          Effect.flatMap(serializeSourceEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'source'),
        ),
        {
          attributes: { 'source.url': input.url },
        },
      ),
  ),

  fromResearch: protectedProcedure.sources.fromResearch.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        createFromResearch(input).pipe(
          Effect.flatMap(serializeSourceEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'source'),
        ),
        {
          attributes: { 'source.researchQuery': input.query.slice(0, 100) },
        },
      ),
  ),

  retry: protectedProcedure.sources.retry.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        retryProcessing({ id: input.id }).pipe(
          Effect.flatMap(serializeSourceEffect),
        ),
        {
          attributes: { 'source.id': input.id },
        },
      ),
  ),
};

export default sourceRouter;
