import { Effect } from 'effect';
import { PersonaRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface DeletePersonaInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const deletePersona = (input: DeletePersonaInput) =>
  Effect.gen(function* () {
    const repo = yield* PersonaRepo;
    return yield* repo.delete(input.id);
  }).pipe(
    Effect.withSpan('useCase.deletePersona', {
      attributes: { 'persona.id': input.id },
    }),
  );
