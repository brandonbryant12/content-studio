import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { NotPersonaOwner } from '../../errors';
import { PersonaRepo } from '../repos';

export interface DeletePersonaInput {
  personaId: string;
}

export const deletePersona = (input: DeletePersonaInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const personaRepo = yield* PersonaRepo;

    const existing = yield* personaRepo.findById(input.personaId);

    if (existing.createdBy !== user.id) {
      return yield* Effect.fail(
        new NotPersonaOwner({ personaId: existing.id, userId: user.id }),
      );
    }

    return yield* personaRepo.delete(input.personaId);
  }).pipe(
    Effect.withSpan('useCase.deletePersona', {
      attributes: { 'persona.id': input.personaId },
    }),
  );
