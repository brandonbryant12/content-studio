import { Effect } from 'effect';
import {
  PodcastRepo,
  type PodcastFull,
  type PodcastWithDocuments,
} from '../repos/podcast-repo';

// =============================================================================
// Types
// =============================================================================

export interface GetPodcastInput {
  podcastId: string;
  includeVersion?: boolean; // If true, include active version
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Get a podcast by ID.
 *
 * @example
 * // Get podcast with documents only
 * const podcast = yield* getPodcast({ podcastId: 'podcast-123' });
 *
 * // Get podcast with active version
 * const podcastFull = yield* getPodcast({ podcastId: 'podcast-123', includeVersion: true });
 */
export const getPodcast = (input: GetPodcastInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;

    if (input.includeVersion) {
      return yield* podcastRepo.findByIdFull(input.podcastId);
    }

    return yield* podcastRepo.findById(input.podcastId);
  }).pipe(
    Effect.withSpan('useCase.getPodcast', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
