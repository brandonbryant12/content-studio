import { ForbiddenError } from '@repo/auth';
import { Effect } from 'effect';
import { StylePresetRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface DeleteStylePresetInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const deleteStylePreset = (input: DeleteStylePresetInput) =>
  Effect.gen(function* () {
    const repo = yield* StylePresetRepo;

    const preset = yield* repo.findById(input.id);

    if (preset.isBuiltIn) {
      return yield* Effect.fail(
        new ForbiddenError({ message: 'Cannot delete built-in presets' }),
      );
    }

    yield* repo.delete(input.id);
    return { deleted: true };
  }).pipe(
    Effect.withSpan('useCase.deleteStylePreset', {
      attributes: { 'preset.id': input.id },
    }),
  );
