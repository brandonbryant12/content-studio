import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { InfographicRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface GetInfographicInput {
  id: string;
  userId?: string;
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
      const ownerId =
        user.role === Role.ADMIN ? (input.userId ?? user.id) : user.id;

      return yield* repo.findByIdForUser(input.id, ownerId);
    }),
});
