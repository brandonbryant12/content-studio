import { requireOwnership } from '@repo/auth/policy';
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

export const deleteVoiceover = (input: DeleteVoiceoverInput) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;

    const voiceover = yield* voiceoverRepo.findById(input.voiceoverId);

    yield* requireOwnership(voiceover.createdBy);

    yield* voiceoverRepo.delete(input.voiceoverId);
  }).pipe(
    Effect.withSpan('useCase.deleteVoiceover', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
