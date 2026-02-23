import { requireRole, Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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
    const user = yield* requireRole(Role.ADMIN);
    const infographicRepo = yield* InfographicRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.infographicId,
      attributes: { 'infographic.id': input.infographicId },
    });
    // Verify infographic exists
    yield* infographicRepo.findById(input.infographicId);

    // Clear approval
    const updated = yield* infographicRepo.clearApproval(input.infographicId);

    return { infographic: updated };
  }).pipe(withUseCaseSpan('useCase.revokeInfographicApproval'));
