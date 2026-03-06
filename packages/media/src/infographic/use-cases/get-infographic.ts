import { getCurrentUser, Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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
    const repo = yield* InfographicRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.id,
      attributes: { 'infographic.id': input.id },
    });
    const infographic = yield* user.role === Role.ADMIN
      ? repo.findById(input.id)
      : repo.findByIdForUser(input.id, user.id);

    return infographic;
  }).pipe(withUseCaseSpan('useCase.getInfographic'));
