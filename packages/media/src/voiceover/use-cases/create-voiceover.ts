import { Effect } from 'effect';
import type { Voiceover } from '@repo/db/schema';
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

/**
 * Create a new voiceover in drafting status.
 *
 * This use case:
 * 1. Gets the current user from FiberRef context
 * 2. Creates the voiceover record (starts in drafting status)
 * 3. Returns the created voiceover
 *
 * @example
 * const voiceover = yield* createVoiceover({
 *   title: 'My Voiceover',
 * });
 */
export const createVoiceover = (input: CreateVoiceoverInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const voiceoverRepo = yield* VoiceoverRepo;

    // Create voiceover (starts in drafting status by default)
    const voiceover = yield* voiceoverRepo.insert({
      title: input.title,
      createdBy: user.id,
    });

    return voiceover;
  }).pipe(
    Effect.withSpan('useCase.createVoiceover'),
  );
