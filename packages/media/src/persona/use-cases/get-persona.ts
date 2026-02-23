import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { PersonaRepo } from '../repos';

export interface GetPersonaInput {
  personaId: string;
}

export const getPersona = (input: GetPersonaInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const personaRepo = yield* PersonaRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.personaId,
      attributes: { 'persona.id': input.personaId },
    });
    const p = yield* personaRepo.findByIdForUser(input.personaId, user.id);

    return p;
  }).pipe(withUseCaseSpan('useCase.getPersona'));
