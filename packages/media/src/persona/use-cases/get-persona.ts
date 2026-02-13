import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { NotPersonaOwner } from '../../errors';
import { PersonaRepo } from '../repos';

export interface GetPersonaInput {
  personaId: string;
}

export const getPersona = (input: GetPersonaInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const personaRepo = yield* PersonaRepo;

    const p = yield* personaRepo.findById(input.personaId);

    if (p.createdBy !== user.id) {
      return yield* Effect.fail(
        new NotPersonaOwner({ personaId: p.id, userId: user.id }),
      );
    }

    return p;
  }).pipe(
    Effect.withSpan('useCase.getPersona', {
      attributes: { 'persona.id': input.personaId },
    }),
  );
