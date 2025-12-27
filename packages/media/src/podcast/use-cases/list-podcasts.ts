import { Effect } from 'effect';
import type { Db, DatabaseError } from '@repo/effect/db';
import {
  PodcastRepo,
  type ListOptions,
  type PodcastWithActiveVersionSummary,
} from '../repos/podcast-repo';

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
  podcasts: readonly PodcastWithActiveVersionSummary[];
  total: number;
  hasMore: boolean;
}

export type ListPodcastsError = DatabaseError;

// =============================================================================
// Use Case
// =============================================================================

/**
 * List podcasts with optional filtering and pagination.
 *
 * @example
 * // List all podcasts for a user
 * const result = yield* listPodcasts({ userId: 'user-123' });
 *
 * // List podcasts in a project with pagination
 * const result = yield* listPodcasts({
 *   projectId: 'project-456',
 *   limit: 10,
 *   offset: 0,
 * });
 */
export const listPodcasts = (
  input: ListPodcastsInput,
): Effect.Effect<ListPodcastsResult, ListPodcastsError, PodcastRepo | Db> =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;

    const options: ListOptions = {
      userId: input.userId,
      projectId: input.projectId,
      limit: input.limit ?? 50,
      offset: input.offset ?? 0,
    };

    // Fetch podcasts with active version summary and count in parallel
    const [podcasts, total] = yield* Effect.all([
      podcastRepo.listWithActiveVersionSummary(options),
      podcastRepo.count(options),
    ]);

    const hasMore = (options.offset ?? 0) + podcasts.length < total;

    return {
      podcasts,
      total,
      hasMore,
    };
  }).pipe(
    Effect.withSpan('useCase.listPodcasts', {
      attributes: {
        'filter.userId': input.userId,
        'filter.projectId': input.projectId,
      },
    }),
  );
