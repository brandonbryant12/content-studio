import { Effect } from 'effect';
import type { Voiceover } from '@repo/db/schema';
import { VoiceoverRepo } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface CreateVoiceoverInput {
  title: string;
  userId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Create a new voiceover in drafting status.
 *
 * This use case:
 * 1. Creates the voiceover record (starts in drafting status)
 * 2. Returns the created voiceover
 *
 * @example
 * const voiceover = yield* createVoiceover({
 *   title: 'My Voiceover',
 *   userId: 'user-123',
 * });
 */
export const createVoiceover = (input: CreateVoiceoverInput) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;

    // Create voiceover (starts in drafting status by default)
    const voiceover = yield* voiceoverRepo.insert({
      title: input.title,
      createdBy: input.userId,
    });

    return voiceover;
  }).pipe(
    Effect.withSpan('useCase.createVoiceover', {
      attributes: { 'user.id': input.userId },
    }),
  );
