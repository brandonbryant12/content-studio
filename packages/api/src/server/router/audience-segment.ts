import {
  serializeAudienceSegmentEffect,
  serializeAudienceSegmentsEffect,
} from '@repo/db/schema';
import {
  listAudienceSegments,
  getAudienceSegment,
  createAudienceSegment,
  updateAudienceSegment,
  deleteAudienceSegment,
} from '@repo/media';
import { Effect } from 'effect';
import { handleEffectWithProtocol, type ErrorFactory } from '../effect-handler';
import { protectedProcedure } from '../orpc';

const audienceSegmentRouter = {
  list: protectedProcedure.audienceSegments.list.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listAudienceSegments(input).pipe(
          Effect.flatMap(serializeAudienceSegmentsEffect),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.audienceSegments.list',
        },
      );
    },
  ),

  get: protectedProcedure.audienceSegments.get.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getAudienceSegment({ id: input.id }).pipe(
          Effect.flatMap(serializeAudienceSegmentEffect),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.audienceSegments.get',
          attributes: { 'audienceSegment.id': input.id },
        },
      );
    },
  ),

  create: protectedProcedure.audienceSegments.create.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createAudienceSegment(input).pipe(
          Effect.flatMap(serializeAudienceSegmentEffect),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.audienceSegments.create',
          attributes: { 'audienceSegment.name': input.name },
        },
      );
    },
  ),

  update: protectedProcedure.audienceSegments.update.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        updateAudienceSegment({ id, ...data }).pipe(
          Effect.flatMap(serializeAudienceSegmentEffect),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.audienceSegments.update',
          attributes: { 'audienceSegment.id': id },
        },
      );
    },
  ),

  delete: protectedProcedure.audienceSegments.delete.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        deleteAudienceSegment({ id: input.id }).pipe(Effect.map(() => ({}))),
        errors as unknown as ErrorFactory,
        {
          span: 'api.audienceSegments.delete',
          attributes: { 'audienceSegment.id': input.id },
        },
      );
    },
  ),
};

export default audienceSegmentRouter;
