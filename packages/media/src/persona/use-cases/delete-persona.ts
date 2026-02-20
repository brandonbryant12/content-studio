import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { PersonaRepo } from '../repos';

export interface DeletePersonaInput {
  personaId: string;
}

export const deletePersona = (input: DeletePersonaInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const personaRepo = yield* PersonaRepo;

    yield* personaRepo.findByIdForUser(input.personaId, user.id);

    return yield* personaRepo.delete(input.personaId);
  }).pipe(
    Effect.withSpan('useCase.deletePersona', {
      attributes: { 'persona.id': input.personaId },
    }),
  );
