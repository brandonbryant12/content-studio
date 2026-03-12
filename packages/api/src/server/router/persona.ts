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
} from '@repo/media/persona';
import { Effect } from 'effect';
import { bindEffectProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';

const personaRouter = {
  list: protectedProcedure.personas.list.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        listPersonas(input).pipe(
          Effect.flatMap((result) =>
            serializePersonasEffect([...result.personas]),
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

  get: protectedProcedure.personas.get.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        getPersona({ personaId: input.id, userId: input.userId }).pipe(
          Effect.flatMap(serializePersonaEffect),
        ),
        {
          attributes: { 'persona.id': input.id },
        },
      ),
  ),

  create: protectedProcedure.personas.create.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        createPersona({
          ...input,
          exampleQuotes: input.exampleQuotes && [...input.exampleQuotes],
        }).pipe(Effect.flatMap(serializePersonaEffect)),
        {
          attributes: { 'persona.name': input.name },
        },
      ),
  ),

  update: protectedProcedure.personas.update.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;

      return bindEffectProtocol({ context, errors }).run(
        updatePersona({
          personaId: id,
          data: {
            ...data,
            exampleQuotes: data.exampleQuotes && [...data.exampleQuotes],
          },
        }).pipe(Effect.flatMap(serializePersonaEffect)),
        {
          attributes: { 'persona.id': id },
        },
      );
    },
  ),

  delete: protectedProcedure.personas.delete.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        deletePersona({ personaId: input.id }).pipe(Effect.as({})),
        {
          attributes: { 'persona.id': input.id },
        },
      ),
  ),

  generateAvatar: protectedProcedure.personas.generateAvatar.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        generateAvatar({ personaId: input.id }).pipe(Effect.as({})),
        {
          attributes: { 'persona.id': input.id },
        },
      ),
  ),
};

export default personaRouter;
