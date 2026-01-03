import { Effect } from 'effect';
import type { Voiceover } from '@repo/db/schema';
import { VoiceoverRepo } from '../repos/voiceover-repo';
import { VoiceoverCollaboratorRepo } from '../repos/voiceover-collaborator-repo';
import { NotVoiceoverCollaborator } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface RevokeVoiceoverApprovalInput {
  voiceoverId: string;
  userId: string; // User ID of the person revoking approval
}

export interface RevokeVoiceoverApprovalResult {
  voiceover: Voiceover;
  isOwner: boolean;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Revoke approval on a voiceover as an owner or collaborator.
 *
 * This use case:
 * 1. Verifies the user is either the owner or a collaborator
 * 2. If owner, sets ownerHasApproved=false on the voiceover
 * 3. If collaborator, sets hasApproved=false on the collaborator record
 *
 * @example
 * const result = yield* revokeVoiceoverApproval({
 *   voiceoverId: 'voc_xxx',
 *   userId: 'user-123',
 * });
 */
export const revokeVoiceoverApproval = (input: RevokeVoiceoverApprovalInput) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;
    const collaboratorRepo = yield* VoiceoverCollaboratorRepo;

    // 1. Load voiceover
    const voiceover = yield* voiceoverRepo.findById(input.voiceoverId);

    // 2. Check if user is owner
    const isOwner = voiceover.createdBy === input.userId;

    if (isOwner) {
      // 3a. Owner revoke - set ownerHasApproved=false
      const updatedVoiceover = yield* voiceoverRepo.setOwnerApproval(
        input.voiceoverId,
        false,
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

    // 4. Revoke collaborator approval
    yield* collaboratorRepo.revokeApproval(voiceover.id, input.userId);

    return { voiceover, isOwner: false };
  }).pipe(
    Effect.withSpan('useCase.revokeVoiceoverApproval', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
