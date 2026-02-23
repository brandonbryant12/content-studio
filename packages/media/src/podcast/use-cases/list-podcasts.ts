import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { Podcast } from '@repo/db/schema';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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
  podcasts: readonly Podcast[];
  total: number;
  hasMore: boolean;
}

// =============================================================================
// Use Case
// =============================================================================

export const listPodcasts = (input: ListPodcastsInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const podcastRepo = yield* PodcastRepo;

    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: user.id,
      attributes: {
        ...(input.projectId ? { 'filter.projectId': input.projectId } : {}),
      },
    });
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
  }).pipe(withUseCaseSpan('useCase.listPodcasts'));
