import { Effect } from 'effect';
import { requireRole, Role } from '@repo/auth/policy';
import { InfographicRepo } from '../repos/infographic-repo';

// =============================================================================
// Types
// =============================================================================

export interface ApproveInfographicInput {
  infographicId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Approve an infographic (admin-only).
 *
 * Records who approved it and when.
 */
export const approveInfographic = (input: ApproveInfographicInput) =>
  Effect.gen(function* () {
    const user = yield* requireRole(Role.ADMIN);
    const infographicRepo = yield* InfographicRepo;

    // Verify infographic exists
    yield* infographicRepo.findById(input.infographicId);

    // Set approval
    const updated = yield* infographicRepo.setApproval(
      input.infographicId,
      user.id,
    );

    return { infographic: updated };
  }).pipe(
    Effect.withSpan('useCase.approveInfographic', {
      attributes: { 'infographic.id': input.infographicId },
    }),
  );
