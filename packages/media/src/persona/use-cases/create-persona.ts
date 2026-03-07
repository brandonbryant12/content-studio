import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { PersonaRepo } from '../repos';

export interface CreatePersonaInput {
  name: string;
  role?: string;
  personalityDescription?: string;
  speakingStyle?: string;
  exampleQuotes?: string[];
  voiceId?: string;
  voiceName?: string;
}

export const createPersona = defineAuthedUseCase<CreatePersonaInput>()({
  name: 'useCase.createPersona',
  run: ({ input, user, annotateSpan }) =>
    Effect.gen(function* () {
      const personaRepo = yield* PersonaRepo;

      const persona = yield* personaRepo.insert({
        name: input.name,
        role: input.role,
        personalityDescription: input.personalityDescription,
        speakingStyle: input.speakingStyle,
        exampleQuotes: input.exampleQuotes,
        voiceId: input.voiceId,
        voiceName: input.voiceName,
        createdBy: user.id,
      });
      yield* annotateSpan({
        resourceId: persona.id,
        attributes: { 'persona.id': persona.id },
      });
      return persona;
    }),
});
