import { Effect } from 'effect';
import { VoiceoverRepo } from '../repos/voiceover-repo';
import { NotVoiceoverOwner } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface DeleteVoiceoverInput {
  voiceoverId: string;
  userId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Delete a voiceover.
 *
 * This use case:
 * 1. Verifies the voiceover exists
 * 2. Deletes the voiceover record
 *
 * Note: Audio files in storage should be cleaned up separately
 * (via a background job or storage lifecycle policy).
 *
 * @example
 * yield* deleteVoiceover({ voiceoverId: 'voc_xxx' });
 */
export const deleteVoiceover = (input: DeleteVoiceoverInput) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;

    // Verify voiceover exists before deleting
    const voiceover = yield* voiceoverRepo.findById(input.voiceoverId);

    // Verify user is the owner
    if (voiceover.createdBy !== input.userId) {
      return yield* Effect.fail(
        new NotVoiceoverOwner({
          voiceoverId: input.voiceoverId,
          userId: input.userId,
        }),
      );
    }

    // Delete
    yield* voiceoverRepo.delete(input.voiceoverId);
  }).pipe(
    Effect.withSpan('useCase.deleteVoiceover', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
