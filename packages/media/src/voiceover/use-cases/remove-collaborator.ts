import { Effect } from 'effect';
import type { VoiceoverCollaboratorId } from '@repo/db/schema';
import { requireOwnership } from '@repo/auth/policy';
import { VoiceoverRepo } from '../repos/voiceover-repo';
import { VoiceoverCollaboratorRepo } from '../repos/voiceover-collaborator-repo';
import { VoiceoverCollaboratorNotFound } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface RemoveVoiceoverCollaboratorInput {
  collaboratorId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Remove a collaborator from a voiceover.
 *
 * This use case:
 * 1. Looks up the collaborator to find the voiceover
 * 2. Verifies the current user is the voiceover owner (via FiberRef)
 * 3. Deletes the collaborator record
 *
 * @example
 * yield* removeVoiceoverCollaborator({
 *   collaboratorId: 'vcl_xxx',
 * });
 */
export const removeVoiceoverCollaborator = (
  input: RemoveVoiceoverCollaboratorInput,
) =>
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

    // 2. Load voiceover and verify ownership via FiberRef
    const voiceover = yield* voiceoverRepo.findById(collaborator.voiceoverId);
    yield* requireOwnership(voiceover.createdBy);

    // 3. Delete the collaborator
    yield* collaboratorRepo.remove(collaborator.id);
  }).pipe(
    Effect.withSpan('useCase.removeVoiceoverCollaborator', {
      attributes: { 'collaborator.id': input.collaboratorId },
    }),
  );
