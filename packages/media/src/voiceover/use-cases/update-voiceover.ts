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

export const updateVoiceover = (input: UpdateVoiceoverInput) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;

    const voiceover = yield* voiceoverRepo.findById(input.voiceoverId);

    if (voiceover.createdBy !== input.userId) {
      return yield* Effect.fail(
        new NotVoiceoverOwner({
          voiceoverId: input.voiceoverId,
          userId: input.userId,
        }),
      );
    }

    return yield* voiceoverRepo.update(input.voiceoverId, input.data);
  }).pipe(
    Effect.withSpan('useCase.updateVoiceover', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
