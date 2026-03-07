import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { defineRoleUseCase } from '../../shared';
import { VoiceoverRepo } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface ApproveVoiceoverInput {
  voiceoverId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Approve a voiceover (admin-only).
 *
 * Records who approved it and when.
 */
export const approveVoiceover = defineRoleUseCase<ApproveVoiceoverInput>()({
  name: 'useCase.approveVoiceover',
  role: Role.ADMIN,
  span: ({ input }) => ({
    resourceId: input.voiceoverId,
    attributes: { 'voiceover.id': input.voiceoverId },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const voiceoverRepo = yield* VoiceoverRepo;

      // Verify voiceover exists
      yield* voiceoverRepo.findById(input.voiceoverId);

      // Set approval
      const updatedVoiceover = yield* voiceoverRepo.setApproval(
        input.voiceoverId,
        user.id,
      );

      return { voiceover: updatedVoiceover };
    }),
});
