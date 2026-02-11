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

export const listVoiceovers = (input: ListVoiceoversInput) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;

    const options: ListOptions = {
      userId: input.userId,
      limit: input.limit ?? 50,
      offset: input.offset ?? 0,
    };

    const [voiceovers, total] = yield* Effect.all(
      [voiceoverRepo.list(options), voiceoverRepo.count(options)],
      { concurrency: 'unbounded' },
    );

    return {
      voiceovers,
      total,
      hasMore: (options.offset ?? 0) + voiceovers.length < total,
    };
  }).pipe(
    Effect.withSpan('useCase.listVoiceovers', {
      attributes: { 'filter.userId': input.userId },
    }),
  );
