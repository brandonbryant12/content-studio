import { Effect } from 'effect';
import type { Voiceover } from '@repo/db/schema';
import { VoiceoverRepo, type ListOptions } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface ListVoiceoversInput {
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface ListVoiceoversResult {
  voiceovers: readonly Voiceover[];
  total: number;
  hasMore: boolean;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * List voiceovers with optional filtering and pagination.
 *
 * @example
 * // List all voiceovers for a user
 * const result = yield* listVoiceovers({ userId: 'user-123' });
 *
 * // List voiceovers with pagination
 * const result = yield* listVoiceovers({
 *   userId: 'user-123',
 *   limit: 10,
 *   offset: 0,
 * });
 */
export const listVoiceovers = (input: ListVoiceoversInput) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;

    const options: ListOptions = {
      userId: input.userId,
      limit: input.limit ?? 50,
      offset: input.offset ?? 0,
    };

    // Fetch voiceovers and count in parallel
    const [voiceovers, total] = yield* Effect.all([
      voiceoverRepo.list(options),
      voiceoverRepo.count(options),
    ]);

    const hasMore = (options.offset ?? 0) + voiceovers.length < total;

    return {
      voiceovers,
      total,
      hasMore,
    };
  }).pipe(
    Effect.withSpan('useCase.listVoiceovers', {
      attributes: {
        'filter.userId': input.userId,
      },
    }),
  );
