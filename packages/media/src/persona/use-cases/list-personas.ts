import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { Persona } from '@repo/db/schema';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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

    yield* annotateUseCaseSpan({
      userId: user.id,
      collection: 'personas',
      attributes: {
        'owner.id': user.id,
        'pagination.limit': limit,
        'pagination.offset': offset,
      },
    });
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
  }).pipe(withUseCaseSpan('useCase.listPersonas'));
