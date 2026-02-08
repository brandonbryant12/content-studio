import { Effect } from 'effect';
import { requireOwnership } from '@repo/auth/policy';
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
    const repo = yield* InfographicRepo;

    const infographic = yield* repo.findById(input.id);
    yield* requireOwnership(infographic.createdBy);

    return infographic;
  }).pipe(
    Effect.withSpan('useCase.getInfographic', {
      attributes: { 'infographic.id': input.id },
    }),
  );
