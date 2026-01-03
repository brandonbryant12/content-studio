import { Effect } from 'effect';
import { PodcastRepo, type PodcastWithDocuments } from '../repos/podcast-repo';

// =============================================================================
// Types
// =============================================================================

export interface GetPodcastInput {
  podcastId: string;
  includeDocuments?: boolean; // If true, include resolved documents
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Get a podcast by ID.
 *
 * @example
 * // Get podcast with documents
 * const podcast = yield* getPodcast({ podcastId: 'podcast-123' });
 *
 * // Get podcast with resolved source documents
 * const podcastFull = yield* getPodcast({ podcastId: 'podcast-123', includeDocuments: true });
 */
export const getPodcast = (input: GetPodcastInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;

    if (input.includeDocuments) {
      return yield* podcastRepo.findByIdFull(input.podcastId);
    }

    return yield* podcastRepo.findById(input.podcastId);
  }).pipe(
    Effect.withSpan('useCase.getPodcast', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
