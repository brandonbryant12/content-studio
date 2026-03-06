import { getCurrentUser, Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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
    const voiceoverRepo = yield* VoiceoverRepo;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.voiceoverId,
      attributes: { 'voiceover.id': input.voiceoverId },
    });
    const voiceover = yield* user.role === Role.ADMIN
      ? voiceoverRepo.findById(input.voiceoverId)
      : voiceoverRepo.findByIdForUser(input.voiceoverId, user.id);
    return voiceover;
  }).pipe(withUseCaseSpan('useCase.getVoiceover'));
