import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { InfographicRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface GetInfographicVersionsInput {
  infographicId: string;
  userId?: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const getInfographicVersions =
  defineAuthedUseCase<GetInfographicVersionsInput>()({
    name: 'useCase.getInfographicVersions',
    span: ({ input }) => ({
      resourceId: input.infographicId,
      attributes: { 'infographic.id': input.infographicId },
    }),
    run: ({ input, user }) =>
      Effect.gen(function* () {
        const repo = yield* InfographicRepo;
        const ownerId =
          user.role === Role.ADMIN ? (input.userId ?? user.id) : user.id;

        // Verify infographic exists and the scoped user owns it.
        yield* repo.findByIdForUser(input.infographicId, ownerId);

        return yield* repo.listVersions(input.infographicId);
      }),
  });
