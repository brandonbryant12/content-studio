import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
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

    return yield* voiceoverRepo.insert({
      title: input.title,
      createdBy: user.id,
    });
  }).pipe(Effect.withSpan('useCase.createVoiceover'));
