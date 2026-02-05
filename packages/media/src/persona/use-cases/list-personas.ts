import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { PersonaRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface ListPersonasInput {
  role?: 'host' | 'cohost';
  limit?: number;
  offset?: number;
}

// =============================================================================
// Use Case
// =============================================================================

export const listPersonas = (input: ListPersonasInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* PersonaRepo;

    return yield* repo.list({
      createdBy: user.id,
      role: input.role,
      limit: input.limit ?? 50,
      offset: input.offset ?? 0,
    });
  }).pipe(
    Effect.withSpan('useCase.listPersonas', {
      attributes: {
        'filter.role': input.role,
        'pagination.limit': input.limit,
        'pagination.offset': input.offset,
      },
    }),
  );
