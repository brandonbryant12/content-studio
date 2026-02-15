import { requireOwnership } from '@repo/auth/policy';
import { Effect } from 'effect';
import { replaceTextContentSafely } from '../../shared';
import {
  DocumentRepo,
  type UpdateDocumentInput as RepoUpdateInput,
} from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface UpdateDocumentInput {
  id: string;
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Use Case
// =============================================================================

export const updateDocument = (input: UpdateDocumentInput) =>
  Effect.gen(function* () {
    const documentRepo = yield* DocumentRepo;

    const existing = yield* documentRepo.findById(input.id);
    yield* requireOwnership(existing.createdBy);

    const updateInput: RepoUpdateInput = {};

    if (input.title !== undefined) {
      updateInput.title = input.title;
    }

    if (input.metadata !== undefined) {
      updateInput.metadata = input.metadata;
    }

    if (input.content === undefined) {
      return yield* documentRepo.update(input.id, updateInput);
    }

    return yield* replaceTextContentSafely({
      previousContentKey: existing.contentKey,
      content: input.content,
      persist: ({ contentKey, wordCount }) =>
        documentRepo.update(input.id, {
          ...updateInput,
          contentKey,
          wordCount,
        }),
    });
  }).pipe(
    Effect.withSpan('useCase.updateDocument', {
      attributes: { 'document.id': input.id },
    }),
  );
