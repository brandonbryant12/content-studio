import { Effect } from 'effect';
import { requireOwnership } from '@repo/auth/policy';
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
    const repo = yield* InfographicRepo;

    // Verify infographic exists and user owns it
    const existing = yield* repo.findById(input.infographicId);
    yield* requireOwnership(existing.createdBy);

    return yield* repo.listVersions(input.infographicId);
  }).pipe(
    Effect.withSpan('useCase.getInfographicVersions', {
      attributes: { 'infographic.id': input.infographicId },
    }),
  );
