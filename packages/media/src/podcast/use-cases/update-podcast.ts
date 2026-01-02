import { Effect } from 'effect';
import type { Podcast, UpdatePodcast } from '@repo/db/schema';
import { PodcastRepo } from '../repos/podcast-repo';

// =============================================================================
// Types
// =============================================================================

export interface UpdatePodcastInput {
  podcastId: string;
  data: UpdatePodcast;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Update a podcast's settings.
 *
 * This is a simple update that only modifies podcast metadata.
 * Regeneration is done explicitly by the user via the generate endpoint.
 */
export const updatePodcast = (input: UpdatePodcastInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;

    // Verify podcast exists
    yield* podcastRepo.findById(input.podcastId);

    // Update podcast metadata
    const updatedPodcast = yield* podcastRepo.update(input.podcastId, input.data);

    return updatedPodcast;
  }).pipe(
    Effect.withSpan('useCase.updatePodcast', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
