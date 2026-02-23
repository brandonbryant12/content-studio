import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
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
    const user = yield* getCurrentUser;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.voiceoverId,
    });
    const voiceoverRepo = yield* VoiceoverRepo;
    const voiceover = yield* voiceoverRepo.findByIdForUser(
      input.voiceoverId,
      user.id,
    );
    return voiceover;
  }).pipe(
    Effect.withSpan('useCase.getVoiceover', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
