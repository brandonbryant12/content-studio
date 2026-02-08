import { Effect } from 'effect';
import { Storage } from '@repo/storage';
import { requireOwnership } from '@repo/auth/policy';
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

export const deleteInfographic = (input: DeleteInfographicInput) =>
  Effect.gen(function* () {
    const repo = yield* InfographicRepo;
    const storage = yield* Storage;

    const existing = yield* repo.findById(input.id);
    yield* requireOwnership(existing.createdBy);

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
  }).pipe(
    Effect.withSpan('useCase.deleteInfographic', {
      attributes: { 'infographic.id': input.id },
    }),
  );
