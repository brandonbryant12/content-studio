import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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
    const user = yield* getCurrentUser;
    const voiceoverRepo = yield* VoiceoverRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.voiceoverId,
      attributes: { 'voiceover.id': input.voiceoverId },
    });
    yield* voiceoverRepo.findByIdForUser(input.voiceoverId, user.id);

    yield* voiceoverRepo.delete(input.voiceoverId);
  }).pipe(withUseCaseSpan('useCase.deleteVoiceover'));
