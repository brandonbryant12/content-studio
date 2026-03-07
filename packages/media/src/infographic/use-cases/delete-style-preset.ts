import { ForbiddenError } from '@repo/auth';
import { Effect } from 'effect';
import { StylePresetNotFound } from '../../errors';
import { defineAuthedUseCase } from '../../shared';
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

export const deleteStylePreset = defineAuthedUseCase<DeleteStylePresetInput>()({
  name: 'useCase.deleteStylePreset',
  span: ({ input }) => ({
    resourceId: input.id,
    attributes: { 'preset.id': input.id },
  }),
  run: ({ input, user }) =>
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

      if (preset.createdBy !== user.id) {
        return yield* Effect.fail(new StylePresetNotFound({ id: input.id }));
      }

      yield* repo.delete(input.id);
      return { deleted: true };
    }),
});
