import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
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

    yield* voiceoverRepo.findByIdForUser(input.voiceoverId, user.id);
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.voiceoverId,
      attributes: { 'voiceover.id': input.voiceoverId },
    });

    yield* voiceoverRepo.delete(input.voiceoverId);
  }).pipe(Effect.withSpan('useCase.deleteVoiceover'));
