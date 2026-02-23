import {
  serializeJobEffect,
  serializeSlideDeckEffect,
  serializeSlideDecksEffect,
  serializeSlideDeckVersionsEffect,
} from '@repo/db/schema';
import {
  createSlideDeck,
  deleteSlideDeck,
  generateSlideDeck,
  getSlideDeck,
  getSlideDeckJob,
  getSlideDeckVersions,
  listSlideDecks,
  updateSlideDeck,
} from '@repo/media';
import { Effect } from 'effect';
import { handleEffectWithProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import { tapLogActivity, tapSyncTitle } from './log-activity';

const slideDeckRouter = {
  list: protectedProcedure.slideDecks.list.handler(
    async ({ context, input, errors }) =>
      handleEffectWithProtocol(
        context.runtime,
        context.user,
        listSlideDecks(input).pipe(
          Effect.flatMap((result) => serializeSlideDecksEffect([...result])),
        ),
        errors,
        {
          requestId: context.requestId,
          span: 'api.slideDecks.list',
          attributes: {
            'pagination.limit': input.limit ?? 50,
            'pagination.offset': input.offset ?? 0,
          },
        },
      ),
  ),

  get: protectedProcedure.slideDecks.get.handler(
    async ({ context, input, errors }) =>
      handleEffectWithProtocol(
        context.runtime,
        context.user,
        getSlideDeck({ id: input.id }).pipe(Effect.flatMap(serializeSlideDeckEffect)),
        errors,
        {
          requestId: context.requestId,
          span: 'api.slideDecks.get',
          attributes: { 'slideDeck.id': input.id },
        },
      ),
  ),

  create: protectedProcedure.slideDecks.create.handler(
    async ({ context, input, errors }) =>
      handleEffectWithProtocol(
        context.runtime,
        context.user,
        createSlideDeck(input).pipe(
          Effect.flatMap(serializeSlideDeckEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'slide_deck'),
        ),
        errors,
        {
          requestId: context.requestId,
          span: 'api.slideDecks.create',
          attributes: { 'slideDeck.title': input.title },
        },
      ),
  ),

  update: protectedProcedure.slideDecks.update.handler(
    async ({ context, input, errors }) =>
      handleEffectWithProtocol(
        context.runtime,
        context.user,
        updateSlideDeck(input).pipe(
          Effect.flatMap(serializeSlideDeckEffect),
          tapSyncTitle(context.runtime, context.user),
        ),
        errors,
        {
          requestId: context.requestId,
          span: 'api.slideDecks.update',
          attributes: { 'slideDeck.id': input.id },
        },
      ),
  ),

  delete: protectedProcedure.slideDecks.delete.handler(
    async ({ context, input, errors }) =>
      handleEffectWithProtocol(
        context.runtime,
        context.user,
        deleteSlideDeck({ id: input.id }).pipe(
          Effect.map(() => ({})),
          tapLogActivity(
            context.runtime,
            context.user,
            'deleted',
            'slide_deck',
            input.id,
          ),
        ),
        errors,
        {
          requestId: context.requestId,
          span: 'api.slideDecks.delete',
          attributes: { 'slideDeck.id': input.id },
        },
      ),
  ),

  generate: protectedProcedure.slideDecks.generate.handler(
    async ({ context, input, errors }) =>
      handleEffectWithProtocol(
        context.runtime,
        context.user,
        generateSlideDeck({ id: input.id }),
        errors,
        {
          requestId: context.requestId,
          span: 'api.slideDecks.generate',
          attributes: { 'slideDeck.id': input.id },
        },
      ),
  ),

  getJob: protectedProcedure.slideDecks.getJob.handler(
    async ({ context, input, errors }) =>
      handleEffectWithProtocol(
        context.runtime,
        context.user,
        getSlideDeckJob({ jobId: input.jobId }).pipe(
          Effect.flatMap(serializeJobEffect),
        ),
        errors,
        {
          requestId: context.requestId,
          span: 'api.slideDecks.getJob',
          attributes: { 'job.id': input.jobId },
        },
      ),
  ),

  listVersions: protectedProcedure.slideDecks.listVersions.handler(
    async ({ context, input, errors }) =>
      handleEffectWithProtocol(
        context.runtime,
        context.user,
        getSlideDeckVersions({ slideDeckId: input.id }).pipe(
          Effect.flatMap((result) =>
            serializeSlideDeckVersionsEffect([...result]),
          ),
        ),
        errors,
        {
          requestId: context.requestId,
          span: 'api.slideDecks.listVersions',
          attributes: { 'slideDeck.id': input.id },
        },
      ),
  ),
};

export default slideDeckRouter;
