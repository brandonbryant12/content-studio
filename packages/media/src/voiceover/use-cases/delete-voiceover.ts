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

export const deleteVoiceover = (input: DeleteVoiceoverInput) =>
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

    yield* voiceoverRepo.delete(input.voiceoverId);
  }).pipe(
    Effect.withSpan('useCase.deleteVoiceover', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
