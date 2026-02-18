import { ForbiddenError } from '@repo/auth';
import { requireOwnership } from '@repo/auth/policy';
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

    if (!preset.createdBy) {
      return yield* Effect.fail(
        new ForbiddenError({ message: 'Cannot delete shared presets' }),
      );
    }

    yield* requireOwnership(preset.createdBy);
    yield* repo.delete(input.id);
    return { deleted: true };
  }).pipe(
    Effect.withSpan('useCase.deleteStylePreset', {
      attributes: { 'preset.id': input.id },
    }),
  );
