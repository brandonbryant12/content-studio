import { oc } from '@orpc/contract';
import { Schema } from 'effect';
import {
  PersonaIdSchema,
  PersonaOutputSchema,
  CreatePersonaSchema,
  UpdatePersonaSchema,
} from '@repo/db/schema';

const std = Schema.standardSchemaV1;

// =============================================================================
// Error Definitions
// =============================================================================

const personaErrors = {
  PERSONA_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        personaId: Schema.String,
      }),
    ),
  },
} as const;

// =============================================================================
// Contract Definition
// =============================================================================

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
      .input(
        std(
          Schema.Struct({
            role: Schema.optional(
              Schema.Union(Schema.Literal('host'), Schema.Literal('cohost')),
            ),
            limit: Schema.optional(Schema.Number),
            offset: Schema.optional(Schema.Number),
          }),
        ),
      )
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
        description: 'Update an existing persona',
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
        description: 'Delete a persona',
      })
      .errors(personaErrors)
      .input(std(Schema.Struct({ id: PersonaIdSchema })))
      .output(std(Schema.Struct({}))),
  });

export default personaContract;
