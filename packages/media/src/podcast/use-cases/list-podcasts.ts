import { Effect } from 'effect';
import type { PodcastListItem } from '@repo/db/schema';
import { defineAuthedUseCase } from '../../shared';
import { PodcastRepo, type ListOptions } from '../repos/podcast-repo';

// =============================================================================
// Types
// =============================================================================

export interface ListPodcastsInput {
  projectId?: string;
  limit?: number;
  offset?: number;
}

export interface ListPodcastsResult {
  podcasts: readonly PodcastListItem[];
  total: number;
  hasMore: boolean;
}

// =============================================================================
// Use Case
// =============================================================================

export const listPodcasts = defineAuthedUseCase<ListPodcastsInput>()({
  name: 'useCase.listPodcasts',
  span: ({ input, user }) => ({
    collection: 'podcasts',
    attributes: {
      'owner.id': user.id,
      ...(input.projectId ? { 'filter.projectId': input.projectId } : {}),
      'pagination.limit': input.limit ?? 50,
      'pagination.offset': input.offset ?? 0,
    },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const podcastRepo = yield* PodcastRepo;

      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;
      const options: ListOptions = {
        createdBy: user.id,
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
    }),
});
