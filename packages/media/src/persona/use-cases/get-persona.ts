import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
import { PersonaRepo } from '../repos';

export interface GetPersonaInput {
  personaId: string;
}

export const getPersona = (input: GetPersonaInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const personaRepo = yield* PersonaRepo;

    const p = yield* personaRepo.findByIdForUser(input.personaId, user.id);
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.personaId,
      attributes: { 'persona.id': input.personaId },
    });

    return p;
  }).pipe(Effect.withSpan('useCase.getPersona'));
