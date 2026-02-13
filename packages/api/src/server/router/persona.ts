import {
  serializePersonaEffect,
  serializePersonasEffect,
} from '@repo/db/schema';
import {
  listPersonas,
  getPersona,
  createPersona,
  updatePersona,
  deletePersona,
  generateAvatar,
} from '@repo/media';
import { Effect } from 'effect';
import { handleEffectWithProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';

const personaRouter = {
  list: protectedProcedure.personas.list.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listPersonas(input).pipe(
          Effect.flatMap((result) =>
            serializePersonasEffect([...result.personas]),
          ),
        ),
        errors,
        {
          span: 'api.personas.list',
          attributes: {
            'pagination.limit': input.limit ?? 50,
            'pagination.offset': input.offset ?? 0,
          },
        },
      );
    },
  ),

  get: protectedProcedure.personas.get.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getPersona({ personaId: input.id }).pipe(
          Effect.flatMap(serializePersonaEffect),
        ),
        errors,
        {
          span: 'api.personas.get',
          attributes: { 'persona.id': input.id },
        },
      );
    },
  ),

  create: protectedProcedure.personas.create.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createPersona({
          ...input,
          exampleQuotes: input.exampleQuotes && [...input.exampleQuotes],
        }).pipe(Effect.flatMap(serializePersonaEffect)),
        errors,
        {
          span: 'api.personas.create',
          attributes: { 'persona.name': input.name },
        },
      );
    },
  ),

  update: protectedProcedure.personas.update.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;

      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        updatePersona({
          personaId: id as string,
          data: {
            ...data,
            exampleQuotes: data.exampleQuotes && [...data.exampleQuotes],
          },
        }).pipe(Effect.flatMap(serializePersonaEffect)),
        errors,
        {
          span: 'api.personas.update',
          attributes: { 'persona.id': id },
        },
      );
    },
  ),

  delete: protectedProcedure.personas.delete.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        deletePersona({ personaId: input.id }).pipe(Effect.map(() => ({}))),
        errors,
        {
          span: 'api.personas.delete',
          attributes: { 'persona.id': input.id },
        },
      );
    },
  ),

  generateAvatar: protectedProcedure.personas.generateAvatar.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        generateAvatar({ personaId: input.id }).pipe(Effect.map(() => ({}))),
        errors,
        {
          span: 'api.personas.generateAvatar',
          attributes: { 'persona.id': input.id },
        },
      );
    },
  ),
};

export default personaRouter;
