import { Effect } from 'effect';
import { Storage } from '@repo/storage';
import { requireOwnership } from '@repo/auth/policy';
import { DocumentNotFound } from '../../errors';
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
    const storage = yield* Storage;
    const documentRepo = yield* DocumentRepo;

    const existing = yield* documentRepo.findById(input.id);
    yield* requireOwnership(existing.createdBy);

    yield* storage.delete(existing.contentKey).pipe(Effect.ignore);

    const deleted = yield* documentRepo.delete(input.id);
    if (!deleted) {
      return yield* Effect.fail(new DocumentNotFound({ id: input.id }));
    }
  }).pipe(
    Effect.withSpan('useCase.deleteDocument', {
      attributes: { 'document.id': input.id },
    }),
  );
