import { Effect } from 'effect';
import { PodcastRepo } from '../repos/podcast-repo';

// =============================================================================
// Types
// =============================================================================

export interface DeletePodcastInput {
  podcastId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Delete a podcast and all its versions.
 *
 * This use case:
 * 1. Verifies the podcast exists
 * 2. Deletes all script versions (cascade)
 * 3. Deletes the podcast record
 *
 * Note: Audio files in storage should be cleaned up separately
 * (via a background job or storage lifecycle policy).
 *
 * @example
 * yield* deletePodcast({ podcastId: 'podcast-123' });
 */
export const deletePodcast = (input: DeletePodcastInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;

    // Verify podcast exists before deleting
    yield* podcastRepo.findById(input.podcastId);

    // Delete (versions cascade)
    yield* podcastRepo.delete(input.podcastId);
  }).pipe(
    Effect.withSpan('useCase.deletePodcast', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
