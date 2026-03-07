import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { StylePresetRepo } from '../repos';

// =============================================================================
// Use Case
// =============================================================================

const listStylePresetsUseCase = defineAuthedUseCase<void>()({
  name: 'useCase.listStylePresets',
  span: ({ user }) => ({
    collection: 'stylePresets',
    attributes: {
      'owner.id': user.id,
    },
  }),
  run: ({ user }) =>
    Effect.gen(function* () {
      const repo = yield* StylePresetRepo;
      return yield* repo.list(user.id);
    }),
});

export const listStylePresets = () => listStylePresetsUseCase(undefined);
