import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { InfographicRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface DeleteInfographicInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const deleteInfographic = defineAuthedUseCase<DeleteInfographicInput>()({
  name: 'useCase.deleteInfographic',
  span: ({ input }) => ({
    resourceId: input.id,
    attributes: { 'infographic.id': input.id },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const repo = yield* InfographicRepo;
      const storage = yield* Storage;
      const existing = yield* repo.findByIdForUser(input.id, user.id);

      // Clean up storage for all versions
      const versions = yield* repo.listVersions(input.id);
      yield* Effect.all(
        versions.flatMap((v) => {
          const effects: Effect.Effect<void, never, never>[] = [];
          if (v.imageStorageKey) {
            effects.push(storage.delete(v.imageStorageKey).pipe(Effect.ignore));
          }
          if (v.thumbnailStorageKey) {
            effects.push(
              storage.delete(v.thumbnailStorageKey).pipe(Effect.ignore),
            );
          }
          return effects;
        }),
        { concurrency: 5 },
      );

      // Clean up main image
      if (existing.imageStorageKey) {
        yield* storage.delete(existing.imageStorageKey).pipe(Effect.ignore);
      }
      if (existing.thumbnailStorageKey) {
        yield* storage.delete(existing.thumbnailStorageKey).pipe(Effect.ignore);
      }

      yield* repo.delete(input.id);
    }),
});
