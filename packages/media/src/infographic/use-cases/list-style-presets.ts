import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { StylePresetRepo } from '../repos';

// =============================================================================
// Use Case
// =============================================================================

export const listStylePresets = () =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* StylePresetRepo;

    return yield* repo.list(user.id);
  }).pipe(Effect.withSpan('useCase.listStylePresets'));
