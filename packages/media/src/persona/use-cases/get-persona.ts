import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { PersonaRepo } from '../repos';

export interface GetPersonaInput {
  personaId: string;
  userId?: string;
}

export const getPersona = defineAuthedUseCase<GetPersonaInput>()({
  name: 'useCase.getPersona',
  span: ({ input }) => ({
    resourceId: input.personaId,
    attributes: { 'persona.id': input.personaId },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const personaRepo = yield* PersonaRepo;
      const ownerId =
        user.role === Role.ADMIN ? (input.userId ?? user.id) : user.id;

      return yield* personaRepo.findByIdForUser(input.personaId, ownerId);
    }),
});
