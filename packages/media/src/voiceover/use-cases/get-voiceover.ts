import { requireOwnership } from '@repo/auth/policy';
import { Effect } from 'effect';
import { VoiceoverRepo } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface GetVoiceoverInput {
  voiceoverId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Get a voiceover by ID.
 *
 * @example
 * const voiceover = yield* getVoiceover({ voiceoverId: 'voc_xxx' });
 */
export const getVoiceover = (input: GetVoiceoverInput) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;
    const voiceover = yield* voiceoverRepo.findById(input.voiceoverId);
    yield* requireOwnership(voiceover.createdBy);
    return voiceover;
  }).pipe(
    Effect.withSpan('useCase.getVoiceover', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
