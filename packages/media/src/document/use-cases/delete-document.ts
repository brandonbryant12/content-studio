import { getCurrentUser } from '@repo/auth/policy';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { DocumentNotFound } from '../../errors';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { DocumentRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface DeleteDocumentInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const deleteDocument = (input: DeleteDocumentInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const storage = yield* Storage;
    const documentRepo = yield* DocumentRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'document.id': input.id },
    });
    const existing = yield* documentRepo.findByIdForUser(input.id, user.id);

    yield* storage.delete(existing.contentKey).pipe(Effect.ignore);

    const deleted = yield* documentRepo.delete(input.id);
    if (!deleted) {
      return yield* Effect.fail(new DocumentNotFound({ id: input.id }));
    }
  }).pipe(withUseCaseSpan('useCase.deleteDocument'));
