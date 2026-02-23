import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
import { DocumentRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface GetDocumentInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const getDocument = (input: GetDocumentInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
    });
    const documentRepo = yield* DocumentRepo;

    const doc = yield* documentRepo.findByIdForUser(input.id, user.id);

    return doc;
  }).pipe(
    Effect.withSpan('useCase.getDocument', {
      attributes: { 'document.id': input.id },
    }),
  );
