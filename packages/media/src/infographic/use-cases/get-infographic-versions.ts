import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { InfographicRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface GetInfographicVersionsInput {
  infographicId: string;
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
        // Verify infographic exists and user owns it
        yield* repo.findByIdForUser(input.infographicId, user.id);

        return yield* repo.listVersions(input.infographicId);
      }),
  });
