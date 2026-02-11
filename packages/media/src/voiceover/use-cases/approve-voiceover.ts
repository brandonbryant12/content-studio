import { Effect } from 'effect';
import { requireRole, Role } from '@repo/auth/policy';
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
export const approveVoiceover = (input: ApproveVoiceoverInput) =>
  Effect.gen(function* () {
    const user = yield* requireRole(Role.ADMIN);
    const voiceoverRepo = yield* VoiceoverRepo;

    // Verify voiceover exists
    yield* voiceoverRepo.findById(input.voiceoverId);

    // Set approval
    const updatedVoiceover = yield* voiceoverRepo.setApproval(
      input.voiceoverId,
      user.id,
    );

    return { voiceover: updatedVoiceover };
  }).pipe(
    Effect.withSpan('useCase.approveVoiceover', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
