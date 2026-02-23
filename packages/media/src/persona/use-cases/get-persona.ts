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
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.personaId,
    });
    const personaRepo = yield* PersonaRepo;

    const p = yield* personaRepo.findByIdForUser(input.personaId, user.id);

    return p;
  }).pipe(
    Effect.withSpan('useCase.getPersona', {
      attributes: { 'persona.id': input.personaId },
    }),
  );
