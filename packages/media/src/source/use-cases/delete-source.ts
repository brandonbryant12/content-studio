import { getCurrentUser } from '@repo/auth/policy';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { SourceNotFound } from '../../errors';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { SourceRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface DeleteSourceInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const deleteSource = (input: DeleteSourceInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const storage = yield* Storage;
    const sourceRepo = yield* SourceRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'source.id': input.id },
    });
    const existing = yield* sourceRepo.findByIdForUser(input.id, user.id);

    yield* storage.delete(existing.contentKey).pipe(Effect.ignore);

    const deleted = yield* sourceRepo.delete(input.id);
    if (!deleted) {
      return yield* Effect.fail(new SourceNotFound({ id: input.id }));
    }
  }).pipe(withUseCaseSpan('useCase.deleteSource'));
