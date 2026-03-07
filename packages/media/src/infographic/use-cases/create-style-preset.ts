import { Effect } from 'effect';
import type { StyleProperty } from '@repo/db/schema';
import { defineAuthedUseCase } from '../../shared';
import { StylePresetRepo } from '../repos';
import { sanitizeStyleProperties } from '../style-properties';

// =============================================================================
// Types
// =============================================================================

export interface CreateStylePresetInput {
  name: string;
  properties: readonly StyleProperty[];
}

// =============================================================================
// Use Case
// =============================================================================

export const createStylePreset = defineAuthedUseCase<CreateStylePresetInput>()({
  name: 'useCase.createStylePreset',
  run: ({ input, user, annotateSpan }) =>
    Effect.gen(function* () {
      const repo = yield* StylePresetRepo;

      const preset = yield* repo.insert({
        name: input.name,
        properties: sanitizeStyleProperties(input.properties),
        isBuiltIn: false,
        createdBy: user.id,
      });
      yield* annotateSpan({
        resourceId: preset.id,
        attributes: { 'stylePreset.id': preset.id },
      });
      return preset;
    }),
});
