import { requireRole, Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { InfographicRepo } from '../repos/infographic-repo';

// =============================================================================
// Types
// =============================================================================

export interface RevokeInfographicApprovalInput {
  infographicId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Revoke approval on an infographic (admin-only).
 *
 * Clears approvedBy and approvedAt.
 */
export const revokeInfographicApproval = (
  input: RevokeInfographicApprovalInput,
) =>
  Effect.gen(function* () {
    yield* requireRole(Role.ADMIN);
    const infographicRepo = yield* InfographicRepo;

    // Verify infographic exists
    yield* infographicRepo.findById(input.infographicId);

    // Clear approval
    const updated = yield* infographicRepo.clearApproval(input.infographicId);

    return { infographic: updated };
  }).pipe(
    Effect.withSpan('useCase.revokeInfographicApproval', {
      attributes: { 'infographic.id': input.infographicId },
    }),
  );
