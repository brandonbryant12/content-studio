import { Effect } from 'effect';
import type { Voiceover, UpdateVoiceover } from '@repo/db/schema';
import { VoiceoverRepo } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface UpdateVoiceoverInput {
  voiceoverId: string;
  data: UpdateVoiceover;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Update a voiceover's settings.
 *
 * This use case updates voiceover metadata (title, text, voice).
 */
export const updateVoiceover = (input: UpdateVoiceoverInput) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;

    // Verify voiceover exists
    yield* voiceoverRepo.findById(input.voiceoverId);

    // Update voiceover metadata
    const updatedVoiceover = yield* voiceoverRepo.update(
      input.voiceoverId,
      input.data,
    );

    return updatedVoiceover;
  }).pipe(
    Effect.withSpan('useCase.updateVoiceover', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
