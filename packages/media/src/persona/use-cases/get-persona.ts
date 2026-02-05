import { Effect } from 'effect';
import { PersonaRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface GetPersonaInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const getPersona = (input: GetPersonaInput) =>
  Effect.gen(function* () {
    const repo = yield* PersonaRepo;
    return yield* repo.findById(input.id);
  }).pipe(
    Effect.withSpan('useCase.getPersona', {
      attributes: { 'persona.id': input.id },
    }),
  );
