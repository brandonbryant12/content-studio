import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { InfographicRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface GetInfographicInput {
  id: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const getInfographic = defineAuthedUseCase<GetInfographicInput>()({
  name: 'useCase.getInfographic',
  span: ({ input }) => ({
    resourceId: input.id,
    attributes: { 'infographic.id': input.id },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const repo = yield* InfographicRepo;
      return yield* user.role === Role.ADMIN
        ? repo.findById(input.id)
        : repo.findByIdForUser(input.id, user.id);
    }),
});
