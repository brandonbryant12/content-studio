import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { PersonaRepo } from '../repos';

export interface DeletePersonaInput {
  personaId: string;
}

export const deletePersona = defineAuthedUseCase<DeletePersonaInput>()({
  name: 'useCase.deletePersona',
  span: ({ input }) => ({
    resourceId: input.personaId,
    attributes: { 'persona.id': input.personaId },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const personaRepo = yield* PersonaRepo;
      yield* personaRepo.findByIdForUser(input.personaId, user.id);

      return yield* personaRepo.delete(input.personaId);
    }),
});
