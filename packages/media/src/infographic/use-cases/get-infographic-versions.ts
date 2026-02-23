import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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

export const getInfographicVersions = (input: GetInfographicVersionsInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const repo = yield* InfographicRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.infographicId,
      attributes: { 'infographic.id': input.infographicId },
    });
    // Verify infographic exists and user owns it
    yield* repo.findByIdForUser(input.infographicId, user.id);

    return yield* repo.listVersions(input.infographicId);
  }).pipe(withUseCaseSpan('useCase.getInfographicVersions'));
