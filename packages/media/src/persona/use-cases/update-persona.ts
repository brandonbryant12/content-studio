import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { PersonaRepo } from '../repos';

export interface UpdatePersonaInput {
  personaId: string;
  data: {
    name?: string;
    role?: string;
    personalityDescription?: string;
    speakingStyle?: string;
    exampleQuotes?: string[];
    voiceId?: string;
    voiceName?: string;
    avatarStorageKey?: string | null;
  };
}

export const updatePersona = defineAuthedUseCase<UpdatePersonaInput>()({
  name: 'useCase.updatePersona',
  span: ({ input }) => ({
    resourceId: input.personaId,
    attributes: { 'persona.id': input.personaId },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const personaRepo = yield* PersonaRepo;
      yield* personaRepo.findByIdForUser(input.personaId, user.id);

      return yield* personaRepo.update(input.personaId, input.data);
    }),
});
