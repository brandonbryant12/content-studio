import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
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

export const getInfographic = (input: GetInfographicInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
    });
    const repo = yield* InfographicRepo;

    const infographic = yield* repo.findByIdForUser(input.id, user.id);

    return infographic;
  }).pipe(
    Effect.withSpan('useCase.getInfographic', {
      attributes: { 'infographic.id': input.id },
    }),
  );
