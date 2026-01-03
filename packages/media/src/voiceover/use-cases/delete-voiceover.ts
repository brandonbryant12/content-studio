import { Effect } from 'effect';
import { VoiceoverRepo } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface DeleteVoiceoverInput {
  voiceoverId: string;
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
    yield* voiceoverRepo.findById(input.voiceoverId);

    // Delete (collaborators cascade)
    yield* voiceoverRepo.delete(input.voiceoverId);
  }).pipe(
    Effect.withSpan('useCase.deleteVoiceover', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
