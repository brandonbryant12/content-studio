import { getCurrentUser } from '@repo/auth/policy';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { DocumentNotFound } from '../../errors';
import { annotateUseCaseSpan } from '../../shared';
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

    const existing = yield* documentRepo.findByIdForUser(input.id, user.id);
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'document.id': input.id },
    });

    yield* storage.delete(existing.contentKey).pipe(Effect.ignore);

    const deleted = yield* documentRepo.delete(input.id);
    if (!deleted) {
      return yield* Effect.fail(new DocumentNotFound({ id: input.id }));
    }
  }).pipe(Effect.withSpan('useCase.deleteDocument'));
