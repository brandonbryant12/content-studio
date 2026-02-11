import { Effect } from 'effect';
import { requireOwnership } from '@repo/auth/policy';
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
    const documentRepo = yield* DocumentRepo;

    const doc = yield* documentRepo.findById(input.id);
    yield* requireOwnership(doc.createdBy);

    return doc;
  }).pipe(
    Effect.withSpan('useCase.getDocument', {
      attributes: { 'document.id': input.id },
    }),
  );
