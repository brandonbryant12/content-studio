import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { NotPersonaOwner } from '../../errors';
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
    const personaRepo = yield* PersonaRepo;

    const existing = yield* personaRepo.findById(input.personaId);

    if (existing.createdBy !== user.id) {
      return yield* Effect.fail(
        new NotPersonaOwner({ personaId: existing.id, userId: user.id }),
      );
    }

    return yield* personaRepo.update(input.personaId, input.data);
  }).pipe(
    Effect.withSpan('useCase.updatePersona', {
      attributes: { 'persona.id': input.personaId },
    }),
  );
