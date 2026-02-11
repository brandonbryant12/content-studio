import { requireOwnership } from '@repo/auth/policy';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { calculateWordCount } from '../../shared';
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
    const storage = yield* Storage;
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

    if (input.content !== undefined) {
      const contentBuffer = Buffer.from(input.content, 'utf-8');

      yield* storage.delete(existing.contentKey).pipe(Effect.ignore);

      const newContentKey = `documents/${crypto.randomUUID()}.txt`;
      yield* storage.upload(newContentKey, contentBuffer, 'text/plain');

      updateInput.contentKey = newContentKey;
      updateInput.wordCount = calculateWordCount(input.content);
    }

    return yield* documentRepo.update(input.id, updateInput);
  }).pipe(
    Effect.withSpan('useCase.updateDocument', {
      attributes: { 'document.id': input.id },
    }),
  );
