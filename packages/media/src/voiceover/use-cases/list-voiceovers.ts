import { Effect } from 'effect';
import type { Voiceover } from '@repo/db/schema';
import { defineAuthedUseCase } from '../../shared';
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

const DEFAULT_LIST_VOICEOVERS_LIMIT = 50;
const DEFAULT_LIST_VOICEOVERS_OFFSET = 0;

export const listVoiceovers = defineAuthedUseCase<ListVoiceoversInput>()({
  name: 'useCase.listVoiceovers',
  span: ({ input, user }) => ({
    collection: 'voiceovers',
    attributes: {
      'owner.id': user.id,
      'pagination.limit': input.limit ?? DEFAULT_LIST_VOICEOVERS_LIMIT,
      'pagination.offset': input.offset ?? DEFAULT_LIST_VOICEOVERS_OFFSET,
    },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const voiceoverRepo = yield* VoiceoverRepo;
      const limit = input.limit ?? DEFAULT_LIST_VOICEOVERS_LIMIT;
      const offset = input.offset ?? DEFAULT_LIST_VOICEOVERS_OFFSET;
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
    }),
});
