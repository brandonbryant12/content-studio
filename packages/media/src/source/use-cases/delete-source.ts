import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { SourceNotFound } from '../../errors';
import { defineAuthedUseCase } from '../../shared';
import { SourceRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface DeleteSourceInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const deleteSource = defineAuthedUseCase<DeleteSourceInput>()({
  name: 'useCase.deleteSource',
  span: ({ input }) => ({
    resourceId: input.id,
    attributes: { 'source.id': input.id },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const storage = yield* Storage;
      const sourceRepo = yield* SourceRepo;
      const existing = yield* sourceRepo.findByIdForUser(input.id, user.id);

      yield* storage.delete(existing.contentKey).pipe(Effect.ignore);

      const deleted = yield* sourceRepo.delete(input.id);
      if (!deleted) {
        return yield* Effect.fail(new SourceNotFound({ id: input.id }));
      }
    }),
});
