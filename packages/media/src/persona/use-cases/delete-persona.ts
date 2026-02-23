import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { PersonaRepo } from '../repos';

export interface DeletePersonaInput {
  personaId: string;
}

export const deletePersona = (input: DeletePersonaInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const personaRepo = yield* PersonaRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.personaId,
      attributes: { 'persona.id': input.personaId },
    });
    yield* personaRepo.findByIdForUser(input.personaId, user.id);

    return yield* personaRepo.delete(input.personaId);
  }).pipe(withUseCaseSpan('useCase.deletePersona'));
