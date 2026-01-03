import { Effect } from 'effect';
import type { Voiceover } from '@repo/db/schema';
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
    return yield* voiceoverRepo.findById(input.voiceoverId);
  }).pipe(
    Effect.withSpan('useCase.getVoiceover', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
