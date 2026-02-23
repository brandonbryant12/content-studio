import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
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

export const updatePersona = (input: UpdatePersonaInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.personaId,
    });
    const personaRepo = yield* PersonaRepo;

    yield* personaRepo.findByIdForUser(input.personaId, user.id);

    return yield* personaRepo.update(input.personaId, input.data);
  }).pipe(
    Effect.withSpan('useCase.updatePersona', {
      attributes: { 'persona.id': input.personaId },
    }),
  );
