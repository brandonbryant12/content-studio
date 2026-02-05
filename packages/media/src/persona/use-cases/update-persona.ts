import { Effect } from 'effect';
import type { UpdatePersona } from '@repo/db/schema';
import { PersonaRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface UpdatePersonaInput extends UpdatePersona {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const updatePersona = (input: UpdatePersonaInput) =>
  Effect.gen(function* () {
    const repo = yield* PersonaRepo;
    const { id, ...data } = input;
    return yield* repo.update(id, data);
  }).pipe(
    Effect.withSpan('useCase.updatePersona', {
      attributes: { 'persona.id': input.id },
    }),
  );
