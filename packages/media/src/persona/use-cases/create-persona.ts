import { Effect } from 'effect';
import type { CreatePersona } from '@repo/db/schema';
import { generatePersonaId } from '@repo/db/schema';
import { getCurrentUser } from '@repo/auth/policy';
import { PersonaRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface CreatePersonaInput extends CreatePersona {}

// =============================================================================
// Use Case
// =============================================================================

export const createPersona = (input: CreatePersonaInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* PersonaRepo;

    return yield* repo.insert({
      id: generatePersonaId(),
      name: input.name,
      role: input.role,
      voiceId: input.voiceId,
      voiceName: input.voiceName,
      personalityDescription: input.personalityDescription,
      speakingStyle: input.speakingStyle,
      createdBy: user.id,
    });
  }).pipe(
    Effect.withSpan('useCase.createPersona', {
      attributes: { 'persona.name': input.name, 'persona.role': input.role },
    }),
  );
