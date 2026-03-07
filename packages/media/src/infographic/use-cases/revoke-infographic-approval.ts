import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { defineRoleUseCase } from '../../shared';
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
export const revokeInfographicApproval =
  defineRoleUseCase<RevokeInfographicApprovalInput>()({
    name: 'useCase.revokeInfographicApproval',
    role: Role.ADMIN,
    span: ({ input }) => ({
      resourceId: input.infographicId,
      attributes: { 'infographic.id': input.infographicId },
    }),
    run: ({ input }) =>
      Effect.gen(function* () {
        const infographicRepo = yield* InfographicRepo;

        // Verify infographic exists
        yield* infographicRepo.findById(input.infographicId);

        // Clear approval
        const updated = yield* infographicRepo.clearApproval(
          input.infographicId,
        );

        return { infographic: updated };
      }),
  });
