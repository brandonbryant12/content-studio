import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
import { PersonaRepo } from '../repos';

export interface DeletePersonaInput {
  personaId: string;
}

export const deletePersona = (input: DeletePersonaInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const personaRepo = yield* PersonaRepo;

    yield* personaRepo.findByIdForUser(input.personaId, user.id);
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.personaId,
      attributes: { 'persona.id': input.personaId },
    });

    return yield* personaRepo.delete(input.personaId);
  }).pipe(Effect.withSpan('useCase.deletePersona'));
