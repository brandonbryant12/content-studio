import {
  serializeBrandEffect,
  serializeBrandListItemsEffect,
  type Brand,
} from '@repo/db/schema';
import {
  listBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
} from '@repo/media/brand';
import { Effect } from 'effect';
import { handleEffectWithProtocol, type ErrorFactory } from '../effect-handler';
import { protectedProcedure } from '../orpc';

const brandRouter = {
  list: protectedProcedure.brands.list.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listBrands(input).pipe(
          Effect.flatMap((result) =>
            serializeBrandListItemsEffect(result.brands as readonly Brand[]),
          ),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.brands.list',
          attributes: {
            'pagination.limit': input.limit ?? 50,
            'pagination.offset': input.offset ?? 0,
          },
        },
      );
    },
  ),

  get: protectedProcedure.brands.get.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getBrand({ id: input.id }).pipe(Effect.flatMap(serializeBrandEffect)),
        errors as unknown as ErrorFactory,
        {
          span: 'api.brands.get',
          attributes: { 'brand.id': input.id },
        },
      );
    },
  ),

  create: protectedProcedure.brands.create.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createBrand(input).pipe(Effect.flatMap(serializeBrandEffect)),
        errors as unknown as ErrorFactory,
        {
          span: 'api.brands.create',
          attributes: { 'brand.name': input.name },
        },
      );
    },
  ),

  update: protectedProcedure.brands.update.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        updateBrand({ id, data }).pipe(Effect.flatMap(serializeBrandEffect)),
        errors as unknown as ErrorFactory,
        {
          span: 'api.brands.update',
          attributes: { 'brand.id': id },
        },
      );
    },
  ),

  delete: protectedProcedure.brands.delete.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        deleteBrand({ id: input.id }).pipe(Effect.map(() => ({}))),
        errors as unknown as ErrorFactory,
        {
          span: 'api.brands.delete',
          attributes: { 'brand.id': input.id },
        },
      );
    },
  ),
};

export default brandRouter;
