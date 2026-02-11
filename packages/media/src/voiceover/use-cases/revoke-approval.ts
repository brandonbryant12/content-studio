import { requireRole, Role } from '@repo/auth/policy';
import { Effect } from 'effect';
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
export const revokeVoiceoverApproval = (input: RevokeVoiceoverApprovalInput) =>
  Effect.gen(function* () {
    yield* requireRole(Role.ADMIN);
    const voiceoverRepo = yield* VoiceoverRepo;

    // Verify voiceover exists
    yield* voiceoverRepo.findById(input.voiceoverId);

    // Clear approval
    const updatedVoiceover = yield* voiceoverRepo.clearApproval(
      input.voiceoverId,
    );

    return { voiceover: updatedVoiceover };
  }).pipe(
    Effect.withSpan('useCase.revokeVoiceoverApproval', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
