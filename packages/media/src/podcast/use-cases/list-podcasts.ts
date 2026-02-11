import { Effect } from 'effect';
import type { Podcast } from '@repo/db/schema';
import { PodcastRepo, type ListOptions } from '../repos/podcast-repo';

// =============================================================================
// Types
// =============================================================================

export interface ListPodcastsInput {
  userId?: string;
  projectId?: string;
  limit?: number;
  offset?: number;
}

export interface ListPodcastsResult {
  podcasts: readonly Podcast[];
  total: number;
  hasMore: boolean;
}

// =============================================================================
// Use Case
// =============================================================================

export const listPodcasts = (input: ListPodcastsInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;

    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    const options: ListOptions = {
      userId: input.userId,
      projectId: input.projectId,
      limit,
      offset,
    };

    const [podcasts, total] = yield* Effect.all(
      [podcastRepo.list(options), podcastRepo.count(options)],
      { concurrency: 'unbounded' },
    );

    return {
      podcasts,
      total,
      hasMore: offset + podcasts.length < total,
    };
  }).pipe(
    Effect.withSpan('useCase.listPodcasts', {
      attributes: {
        'filter.userId': input.userId,
        'filter.projectId': input.projectId,
      },
    }),
  );
