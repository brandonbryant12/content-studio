import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
import { VoiceoverRepo } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface CreateVoiceoverInput {
  title: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const createVoiceover = (input: CreateVoiceoverInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const voiceoverRepo = yield* VoiceoverRepo;

    const voiceover = yield* voiceoverRepo.insert({
      title: input.title,
      createdBy: user.id,
    });

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: voiceover.id,
    });

    return voiceover;
  }).pipe(Effect.withSpan('useCase.createVoiceover'));
