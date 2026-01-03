import { Effect } from 'effect';
import type { Voiceover } from '@repo/db/schema';
import { VoiceoverRepo } from '../repos/voiceover-repo';
import { VoiceoverCollaboratorRepo } from '../repos/voiceover-collaborator-repo';
import { NotVoiceoverCollaborator } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface ApproveVoiceoverInput {
  voiceoverId: string;
  userId: string; // User ID of the person approving
}

export interface ApproveVoiceoverResult {
  voiceover: Voiceover;
  isOwner: boolean;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Approve a voiceover as an owner or collaborator.
 *
 * This use case:
 * 1. Verifies the user is either the owner or a collaborator
 * 2. If owner, sets ownerHasApproved=true on the voiceover
 * 3. If collaborator, sets hasApproved=true on the collaborator record
 *
 * @example
 * const result = yield* approveVoiceover({
 *   voiceoverId: 'voc_xxx',
 *   userId: 'user-123',
 * });
 */
export const approveVoiceover = (input: ApproveVoiceoverInput) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;
    const collaboratorRepo = yield* VoiceoverCollaboratorRepo;

    // 1. Load voiceover
    const voiceover = yield* voiceoverRepo.findById(input.voiceoverId);

    // 2. Check if user is owner
    const isOwner = voiceover.createdBy === input.userId;

    if (isOwner) {
      // 3a. Owner approval - set ownerHasApproved=true
      const updatedVoiceover = yield* voiceoverRepo.setOwnerApproval(
        input.voiceoverId,
        true,
      );
      return { voiceover: updatedVoiceover, isOwner: true };
    }

    // 3b. Check if user is a collaborator
    const collaborator = yield* collaboratorRepo.findByVoiceoverAndUser(
      voiceover.id,
      input.userId,
    );

    if (!collaborator) {
      return yield* Effect.fail(
        new NotVoiceoverCollaborator({
          voiceoverId: input.voiceoverId,
          userId: input.userId,
        }),
      );
    }

    // 4. Update collaborator approval
    yield* collaboratorRepo.approve(voiceover.id, input.userId);

    return { voiceover, isOwner: false };
  }).pipe(
    Effect.withSpan('useCase.approveVoiceover', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
