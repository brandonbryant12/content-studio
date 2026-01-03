import { Effect } from 'effect';
import type { VoiceoverCollaboratorId } from '@repo/db/schema';
import { VoiceoverRepo } from '../repos/voiceover-repo';
import { VoiceoverCollaboratorRepo } from '../repos/voiceover-collaborator-repo';
import { NotVoiceoverOwner, VoiceoverCollaboratorNotFound } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface RemoveVoiceoverCollaboratorInput {
  collaboratorId: string;
  removedBy: string; // User ID of the person removing the collaborator
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Remove a collaborator from a voiceover.
 *
 * This use case:
 * 1. Looks up the collaborator to find the voiceover
 * 2. Verifies the removedBy user is the voiceover owner
 * 3. Deletes the collaborator record
 *
 * @example
 * yield* removeVoiceoverCollaborator({
 *   collaboratorId: 'vcl_xxx',
 *   removedBy: 'user-123',
 * });
 */
export const removeVoiceoverCollaborator = (input: RemoveVoiceoverCollaboratorInput) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;
    const collaboratorRepo = yield* VoiceoverCollaboratorRepo;

    // 1. Look up the collaborator to find the voiceover
    const collaborator = yield* collaboratorRepo.findById(
      input.collaboratorId as VoiceoverCollaboratorId,
    );

    if (!collaborator) {
      return yield* Effect.fail(
        new VoiceoverCollaboratorNotFound({ id: input.collaboratorId }),
      );
    }

    // 2. Load voiceover and verify ownership
    const voiceover = yield* voiceoverRepo.findById(collaborator.voiceoverId);

    if (voiceover.createdBy !== input.removedBy) {
      return yield* Effect.fail(
        new NotVoiceoverOwner({
          voiceoverId: collaborator.voiceoverId,
          userId: input.removedBy,
        }),
      );
    }

    // 3. Delete the collaborator
    yield* collaboratorRepo.remove(collaborator.id);
  }).pipe(
    Effect.withSpan('useCase.removeVoiceoverCollaborator', {
      attributes: { 'collaborator.id': input.collaboratorId },
    }),
  );
