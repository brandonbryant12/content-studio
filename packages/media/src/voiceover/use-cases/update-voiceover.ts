import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { UpdateVoiceover } from '@repo/db/schema';
import { annotateUseCaseSpan } from '../../shared';
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
    const user = yield* getCurrentUser;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.voiceoverId,
    });
    const voiceoverRepo = yield* VoiceoverRepo;

    yield* voiceoverRepo.findByIdForUser(input.voiceoverId, user.id);

    return yield* voiceoverRepo.update(input.voiceoverId, input.data);
  }).pipe(
    Effect.withSpan('useCase.updateVoiceover', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
