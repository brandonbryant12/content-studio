import {
  listInfographics,
  getInfographic,
  createInfographic,
  updateInfographic,
  deleteInfographic,
  generateInfographic,
  getInfographicJob,
  getInfographicVersions,
} from '@repo/media';
import { Effect } from 'effect';
import { handleEffectWithProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import { tapLogActivity } from './log-activity';
import {
  serializeInfographicEffect,
  serializeInfographicsEffect,
  serializeInfographicVersionsEffect,
  serializeJob,
  type Job,
} from '@repo/db/schema';

const infographicRouter = {
  list: protectedProcedure.infographics.list.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listInfographics({
          limit: input.limit,
          offset: input.offset,
        }).pipe(
          Effect.flatMap((result) => serializeInfographicsEffect([...result])),
        ),
        errors,
        {
          span: 'api.infographics.list',
          attributes: {
            'pagination.limit': input.limit ?? 50,
            'pagination.offset': input.offset ?? 0,
          },
        },
      );
    },
  ),

  get: protectedProcedure.infographics.get.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getInfographic({ id: input.id }).pipe(
          Effect.flatMap(serializeInfographicEffect),
        ),
        errors,
        {
          span: 'api.infographics.get',
          attributes: { 'infographic.id': input.id },
        },
      );
    },
  ),

  create: protectedProcedure.infographics.create.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createInfographic(input).pipe(
          Effect.flatMap(serializeInfographicEffect),
          tapLogActivity(
            context.runtime,
            context.user,
            'created',
            'infographic',
          ),
        ),
        errors,
        {
          span: 'api.infographics.create',
          attributes: { 'infographic.title': input.title },
        },
      );
    },
  ),

  update: protectedProcedure.infographics.update.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        updateInfographic(input).pipe(
          Effect.flatMap(serializeInfographicEffect),
          tapLogActivity(
            context.runtime,
            context.user,
            'updated',
            'infographic',
          ),
        ),
        errors,
        {
          span: 'api.infographics.update',
          attributes: { 'infographic.id': input.id },
        },
      );
    },
  ),

  delete: protectedProcedure.infographics.delete.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        deleteInfographic({ id: input.id }).pipe(
          Effect.map(() => ({})),
          tapLogActivity(
            context.runtime,
            context.user,
            'deleted',
            'infographic',
            input.id,
          ),
        ),
        errors,
        {
          span: 'api.infographics.delete',
          attributes: { 'infographic.id': input.id },
        },
      );
    },
  ),

  generate: protectedProcedure.infographics.generate.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        generateInfographic({ id: input.id }),
        errors,
        {
          span: 'api.infographics.generate',
          attributes: { 'infographic.id': input.id },
        },
      );
    },
  ),

  getJob: protectedProcedure.infographics.getJob.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getInfographicJob({ jobId: input.jobId }).pipe(
          Effect.map((job) => serializeJob(job as unknown as Job)),
        ),
        errors,
        {
          span: 'api.infographics.getJob',
          attributes: { 'job.id': input.jobId },
        },
      );
    },
  ),

  listVersions: protectedProcedure.infographics.listVersions.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getInfographicVersions({ infographicId: input.id }).pipe(
          Effect.flatMap((result) =>
            serializeInfographicVersionsEffect([...result]),
          ),
        ),
        errors,
        {
          span: 'api.infographics.listVersions',
          attributes: { 'infographic.id': input.id },
        },
      );
    },
  ),
};

export default infographicRouter;
