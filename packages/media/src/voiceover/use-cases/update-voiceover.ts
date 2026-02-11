import { Effect } from 'effect';
import type { UpdateVoiceover } from '@repo/db/schema';
import { requireOwnership } from '@repo/auth/policy';
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

export const updateVoiceover = (input: UpdateVoiceoverInput) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;

    const voiceover = yield* voiceoverRepo.findById(input.voiceoverId);

    yield* requireOwnership(voiceover.createdBy);

    return yield* voiceoverRepo.update(input.voiceoverId, input.data);
  }).pipe(
    Effect.withSpan('useCase.updateVoiceover', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
