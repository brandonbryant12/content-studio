import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
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

export const createPersona = (input: CreatePersonaInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const personaRepo = yield* PersonaRepo;

    return yield* personaRepo.insert({
      name: input.name,
      role: input.role,
      personalityDescription: input.personalityDescription,
      speakingStyle: input.speakingStyle,
      exampleQuotes: input.exampleQuotes,
      voiceId: input.voiceId,
      voiceName: input.voiceName,
      createdBy: user.id,
    });
  }).pipe(Effect.withSpan('useCase.createPersona'));
