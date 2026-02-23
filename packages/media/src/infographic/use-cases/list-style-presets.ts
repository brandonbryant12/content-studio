import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
import { StylePresetRepo } from '../repos';

// =============================================================================
// Use Case
// =============================================================================

export const listStylePresets = () =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: user.id,
    });
    const repo = yield* StylePresetRepo;

    return yield* repo.list(user.id);
  }).pipe(Effect.withSpan('useCase.listStylePresets'));
