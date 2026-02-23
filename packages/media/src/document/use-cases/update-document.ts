import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { JsonValue } from '@repo/db/schema';
import {
  annotateUseCaseSpan,
  replaceTextContentSafely,
  withUseCaseSpan,
} from '../../shared';
import {
  DocumentRepo,
  type UpdateDocumentInput as RepoUpdateInput,
} from '../repos';
import { sanitizeMetadata } from '../sanitize-metadata';

// =============================================================================
// Types
// =============================================================================

export interface UpdateDocumentInput {
  id: string;
  title?: string;
  content?: string;
  metadata?: Record<string, JsonValue>;
}

// =============================================================================
// Use Case
// =============================================================================

export const updateDocument = (input: UpdateDocumentInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const documentRepo = yield* DocumentRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'document.id': input.id },
    });
    const existing = yield* documentRepo.findByIdForUser(input.id, user.id);

    const updateInput: RepoUpdateInput = {};

    if (input.title !== undefined) {
      updateInput.title = input.title;
    }

    if (input.metadata !== undefined) {
      updateInput.metadata = sanitizeMetadata(input.metadata);
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
  }).pipe(withUseCaseSpan('useCase.updateDocument'));
