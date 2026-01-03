import { Effect } from 'effect';
import type { UpdateVoiceover } from '@repo/db/schema';
import { VoiceoverRepo } from '../repos/voiceover-repo';
import { NotVoiceoverOwner } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface UpdateVoiceoverInput {
  voiceoverId: string;
  userId: string;
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
