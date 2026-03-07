import { Effect } from 'effect';
import type { JsonValue } from '@repo/db/schema';
import { defineAuthedUseCase, replaceTextContentSafely } from '../../shared';
import {
  SourceRepo,
  type UpdateSourceInput as RepoUpdateInput,
} from '../repos';
import { sanitizeMetadata } from '../sanitize-metadata';

// =============================================================================
// Types
// =============================================================================

export interface UpdateSourceInput {
  id: string;
  title?: string;
  content?: string;
  metadata?: Record<string, JsonValue>;
}

// =============================================================================
// Use Case
// =============================================================================

export const updateSource = defineAuthedUseCase<UpdateSourceInput>()({
  name: 'useCase.updateSource',
  span: ({ input }) => ({
    resourceId: input.id,
    attributes: { 'source.id': input.id },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const sourceRepo = yield* SourceRepo;
      const existing = yield* sourceRepo.findByIdForUser(input.id, user.id);

      const updateInput: RepoUpdateInput = {};

      if (input.title !== undefined) {
        updateInput.title = input.title;
      }

      if (input.metadata !== undefined) {
        updateInput.metadata = sanitizeMetadata(input.metadata);
      }

      if (input.content === undefined) {
        return yield* sourceRepo.update(input.id, updateInput);
      }

      return yield* replaceTextContentSafely({
        previousContentKey: existing.contentKey,
        content: input.content,
        persist: ({ contentKey, wordCount }) =>
          sourceRepo.update(input.id, {
            ...updateInput,
            contentKey,
            wordCount,
          }),
      });
    }),
});
