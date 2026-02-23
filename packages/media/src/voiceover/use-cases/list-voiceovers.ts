import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { Voiceover } from '@repo/db/schema';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { VoiceoverRepo, type ListOptions } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface ListVoiceoversInput {
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
    const user = yield* getCurrentUser;
    const voiceoverRepo = yield* VoiceoverRepo;

    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: user.id,
      attributes: {
        'pagination.limit': limit,
        'pagination.offset': offset,
      },
    });
    const options: ListOptions = {
      userId: user.id,
      limit,
      offset,
    };

    const [voiceovers, total] = yield* Effect.all(
      [voiceoverRepo.list(options), voiceoverRepo.count(options)],
      { concurrency: 'unbounded' },
    );

    return {
      voiceovers,
      total,
      hasMore: offset + voiceovers.length < total,
    };
  }).pipe(withUseCaseSpan('useCase.listVoiceovers'));
