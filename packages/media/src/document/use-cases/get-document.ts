import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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
    const documentRepo = yield* DocumentRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'document.id': input.id },
    });
    const doc = yield* documentRepo.findByIdForUser(input.id, user.id);

    return doc;
  }).pipe(withUseCaseSpan('useCase.getDocument'));
