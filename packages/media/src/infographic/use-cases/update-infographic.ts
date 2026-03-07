import { Effect } from 'effect';
import type { InfographicFormat, StyleProperty } from '@repo/db/schema';
import { defineAuthedUseCase } from '../../shared';
import { InfographicRepo } from '../repos';
import { sanitizeStyleProperties } from '../style-properties';

// =============================================================================
// Types
// =============================================================================

export interface UpdateInfographicInput {
  id: string;
  title?: string;
  prompt?: string;
  styleProperties?: readonly StyleProperty[];
  format?: InfographicFormat;
}

// =============================================================================
// Use Case
// =============================================================================

export const updateInfographic = defineAuthedUseCase<UpdateInfographicInput>()({
  name: 'useCase.updateInfographic',
  span: ({ input }) => ({
    resourceId: input.id,
    attributes: { 'infographic.id': input.id },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const repo = yield* InfographicRepo;
      yield* repo.findByIdForUser(input.id, user.id);

      return yield* repo.update(input.id, {
        title: input.title,
        prompt: input.prompt,
        styleProperties: input.styleProperties
          ? sanitizeStyleProperties(input.styleProperties)
          : undefined,
        format: input.format,
      });
    }),
});
