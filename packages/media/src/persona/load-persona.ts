import { Effect } from 'effect';
import { PersonaRepo } from './repos';

/**
 * Load a persona by ID, returning `null` when not found instead of failing.
 * This is the shared safe-load pattern used by podcast and other generation
 * use cases that reference optional persona assignments.
 */
export const loadPersonaByIdSafe = (personaId: string) =>
  Effect.gen(function* () {
    const personaRepo = yield* PersonaRepo;
    return yield* personaRepo
      .findById(personaId)
      .pipe(Effect.catchTag('PersonaNotFound', () => Effect.succeed(null)));
  });
