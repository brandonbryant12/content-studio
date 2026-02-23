import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
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
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: persona.id,
      attributes: { 'persona.id': persona.id },
    });
    return persona;
  }).pipe(Effect.withSpan('useCase.createPersona'));
