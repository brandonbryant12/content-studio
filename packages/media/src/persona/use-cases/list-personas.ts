import { Effect } from 'effect';
import type { Persona } from '@repo/db/schema';
import { defineAuthedUseCase } from '../../shared';
import { PersonaRepo, type PersonaListOptions } from '../repos';

export interface ListPersonasInput {
  limit?: number;
  offset?: number;
}

export interface ListPersonasResult {
  personas: readonly Persona[];
  total: number;
  hasMore: boolean;
}

const DEFAULT_LIST_PERSONAS_LIMIT = 50;
const DEFAULT_LIST_PERSONAS_OFFSET = 0;

export const listPersonas = defineAuthedUseCase<ListPersonasInput>()({
  name: 'useCase.listPersonas',
  span: ({ input, user }) => ({
    collection: 'personas',
    attributes: {
      'owner.id': user.id,
      'pagination.limit': input.limit ?? DEFAULT_LIST_PERSONAS_LIMIT,
      'pagination.offset': input.offset ?? DEFAULT_LIST_PERSONAS_OFFSET,
    },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const personaRepo = yield* PersonaRepo;
      const limit = input.limit ?? DEFAULT_LIST_PERSONAS_LIMIT;
      const offset = input.offset ?? DEFAULT_LIST_PERSONAS_OFFSET;
      const options: PersonaListOptions = {
        createdBy: user.id,
        limit,
        offset,
      };

      const [personas, total] = yield* Effect.all(
        [personaRepo.list(options), personaRepo.count(options)],
        { concurrency: 'unbounded' },
      );

      return {
        personas,
        total,
        hasMore: offset + personas.length < total,
      };
    }),
});
