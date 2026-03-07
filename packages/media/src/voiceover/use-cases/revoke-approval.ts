import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { defineRoleUseCase } from '../../shared';
import { VoiceoverRepo } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface RevokeVoiceoverApprovalInput {
  voiceoverId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Revoke approval on a voiceover (admin-only).
 *
 * Clears approvedBy and approvedAt.
 */
export const revokeVoiceoverApproval =
  defineRoleUseCase<RevokeVoiceoverApprovalInput>()({
    name: 'useCase.revokeVoiceoverApproval',
    role: Role.ADMIN,
    span: ({ input }) => ({
      resourceId: input.voiceoverId,
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
    run: ({ input }) =>
      Effect.gen(function* () {
        const voiceoverRepo = yield* VoiceoverRepo;

        // Verify voiceover exists
        yield* voiceoverRepo.findById(input.voiceoverId);

        // Clear approval
        const updatedVoiceover = yield* voiceoverRepo.clearApproval(
          input.voiceoverId,
        );

        return { voiceover: updatedVoiceover };
      }),
  });
