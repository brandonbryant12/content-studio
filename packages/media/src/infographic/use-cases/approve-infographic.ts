import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { defineRoleUseCase } from '../../shared';
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
export const approveInfographic = defineRoleUseCase<ApproveInfographicInput>()({
  name: 'useCase.approveInfographic',
  role: Role.ADMIN,
  span: ({ input }) => ({
    resourceId: input.infographicId,
    attributes: { 'infographic.id': input.infographicId },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const infographicRepo = yield* InfographicRepo;

      // Verify infographic exists
      yield* infographicRepo.findById(input.infographicId);

      // Set approval
      const updated = yield* infographicRepo.setApproval(
        input.infographicId,
        user.id,
      );

      return { infographic: updated };
    }),
});
