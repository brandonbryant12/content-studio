import { serializeSvgEffect, serializeSvgMessageEffect } from '@repo/db/schema';
import {
  listSvgs,
  createSvg,
  getSvg,
  updateSvg,
  deleteSvg,
  streamSvgChat,
  listMessages,
} from '@repo/media';
import { Effect } from 'effect';
import {
  handleEffectWithProtocol,
  handleEffectStreamWithProtocol,
} from '../effect-handler';
import { protectedProcedure } from '../orpc';

const svgRouter = {
  list: protectedProcedure.svgs.list.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listSvgs(input).pipe(
          Effect.flatMap((result) =>
            Effect.all([...result].map(serializeSvgEffect), {
              concurrency: 'unbounded',
            }),
          ),
        ),
        errors,
        {
          requestId: context.requestId,
          span: 'api.svgs.list',
          attributes: {
            'pagination.limit': input.limit ?? 50,
            'pagination.offset': input.offset ?? 0,
          },
        },
      );
    },
  ),

  create: protectedProcedure.svgs.create.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createSvg(input).pipe(Effect.flatMap(serializeSvgEffect)),
        errors,
        {
          requestId: context.requestId,
          span: 'api.svgs.create',
          attributes: {
            'svg.hasTitle': Boolean(input.title),
            'svg.hasDescription': Boolean(input.description),
          },
        },
      );
    },
  ),

  get: protectedProcedure.svgs.get.handler(async ({ context, input, errors }) =>
    handleEffectWithProtocol(
      context.runtime,
      context.user,
      getSvg({ svgId: input.id }).pipe(Effect.flatMap(serializeSvgEffect)),
      errors,
      {
        requestId: context.requestId,
        span: 'api.svgs.get',
        attributes: { 'svg.id': input.id },
      },
    ),
  ),

  update: protectedProcedure.svgs.update.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;

      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        updateSvg({ svgId: id, ...data }).pipe(
          Effect.flatMap(serializeSvgEffect),
        ),
        errors,
        {
          requestId: context.requestId,
          span: 'api.svgs.update',
          attributes: { 'svg.id': id },
        },
      );
    },
  ),

  delete: protectedProcedure.svgs.delete.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        deleteSvg({ svgId: input.id }).pipe(Effect.map(() => ({}))),
        errors,
        {
          requestId: context.requestId,
          span: 'api.svgs.delete',
          attributes: { 'svg.id': input.id },
        },
      );
    },
  ),

  chat: protectedProcedure.svgs.chat.handler(async ({ context, input, errors }) =>
    handleEffectStreamWithProtocol(
      context.runtime,
      context.user,
      streamSvgChat({ svgId: input.id, message: input.message }),
      errors,
      {
        requestId: context.requestId,
        span: 'api.svgs.chat',
        attributes: { 'svg.id': input.id },
      },
    ),
  ),

  messages: protectedProcedure.svgs.messages.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listMessages({ svgId: input.id }).pipe(
          Effect.flatMap((result) =>
            Effect.all([...result].map(serializeSvgMessageEffect), {
              concurrency: 'unbounded',
            }),
          ),
        ),
        errors,
        {
          requestId: context.requestId,
          span: 'api.svgs.messages',
          attributes: { 'svg.id': input.id },
        },
      );
    },
  ),
};

export default svgRouter;
