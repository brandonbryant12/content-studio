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
    const repo = yield* StylePresetRepo;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: user.id,
    });

    return yield* repo.list(user.id);
  }).pipe(Effect.withSpan('useCase.listStylePresets'));
