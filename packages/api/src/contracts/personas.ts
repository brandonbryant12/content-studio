import { oc } from '@orpc/contract';
import {
  PersonaOutputSchema,
  CreatePersonaSchema,
  UpdatePersonaSchema,
  PersonaIdSchema,
} from '@repo/db/schema';
import { Schema } from 'effect';
import { std, PaginationFields } from './shared';

const personaErrors = {
  PERSONA_NOT_FOUND: {
    status: 404,
    data: std(Schema.Struct({ personaId: Schema.String })),
  },
  NOT_PERSONA_OWNER: {
    status: 403,
  },
} as const;

const personaContract = oc
  .prefix('/personas')
  .tag('persona')
  .router({
    list: oc
      .route({
        method: 'GET',
        path: '/',
        summary: 'List personas',
        description: 'Retrieve all personas for the current user',
      })
      .input(std(Schema.Struct(PaginationFields)))
      .output(std(Schema.Array(PersonaOutputSchema))),

    get: oc
      .route({
        method: 'GET',
        path: '/{id}',
        summary: 'Get persona',
        description: 'Retrieve a persona by ID',
      })
      .errors(personaErrors)
      .input(std(Schema.Struct({ id: PersonaIdSchema })))
      .output(std(PersonaOutputSchema)),

    create: oc
      .route({
        method: 'POST',
        path: '/',
        summary: 'Create persona',
        description: 'Create a new persona',
      })
      .input(std(CreatePersonaSchema))
      .output(std(PersonaOutputSchema)),

    update: oc
      .route({
        method: 'PATCH',
        path: '/{id}',
        summary: 'Update persona',
        description: 'Update persona settings',
      })
      .errors(personaErrors)
      .input(
        std(
          Schema.Struct({
            id: PersonaIdSchema,
            ...UpdatePersonaSchema.fields,
          }),
        ),
      )
      .output(std(PersonaOutputSchema)),

    delete: oc
      .route({
        method: 'DELETE',
        path: '/{id}',
        summary: 'Delete persona',
        description: 'Permanently delete a persona',
      })
      .errors(personaErrors)
      .input(std(Schema.Struct({ id: PersonaIdSchema })))
      .output(std(Schema.Struct({}))),

    generateAvatar: oc
      .route({
        method: 'POST',
        path: '/{id}/avatar',
        summary: 'Generate avatar',
        description: 'Generate an AI avatar image for the persona',
      })
      .errors(personaErrors)
      .input(std(Schema.Struct({ id: PersonaIdSchema })))
      .output(std(Schema.Struct({}))),
  });

export default personaContract;
