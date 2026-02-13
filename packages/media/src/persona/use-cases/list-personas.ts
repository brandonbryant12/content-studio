import { getCurrentUser } from '@repo/auth/policy';
import type { Persona } from '@repo/db/schema';
import { Effect } from 'effect';
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

export const listPersonas = (input: ListPersonasInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const personaRepo = yield* PersonaRepo;

    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
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
  }).pipe(Effect.withSpan('useCase.listPersonas'));
