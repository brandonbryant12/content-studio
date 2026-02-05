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
} from '@repo/media';
import { Effect } from 'effect';
import { handleEffectWithProtocol, type ErrorFactory } from '../effect-handler';
import { protectedProcedure } from '../orpc';

const personaRouter = {
  list: protectedProcedure.personas.list.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listPersonas(input).pipe(Effect.flatMap(serializePersonasEffect)),
        errors as unknown as ErrorFactory,
        {
          span: 'api.personas.list',
          attributes: input.role ? { 'filter.role': input.role } : {},
        },
      );
    },
  ),

  get: protectedProcedure.personas.get.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getPersona({ id: input.id }).pipe(
          Effect.flatMap(serializePersonaEffect),
        ),
        errors as unknown as ErrorFactory,
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
        createPersona(input).pipe(Effect.flatMap(serializePersonaEffect)),
        errors as unknown as ErrorFactory,
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
        updatePersona({ id, ...data }).pipe(
          Effect.flatMap(serializePersonaEffect),
        ),
        errors as unknown as ErrorFactory,
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
        deletePersona({ id: input.id }).pipe(Effect.map(() => ({}))),
        errors as unknown as ErrorFactory,
        {
          span: 'api.personas.delete',
          attributes: { 'persona.id': input.id },
        },
      );
    },
  ),
};

export default personaRouter;
