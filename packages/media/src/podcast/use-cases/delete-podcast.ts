import { requireOwnership } from '@repo/auth/policy';
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

export const deletePodcast = (input: DeletePodcastInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;

    const podcast = yield* podcastRepo.findById(input.podcastId);
    yield* requireOwnership(podcast.createdBy);

    yield* podcastRepo.delete(input.podcastId);
  }).pipe(
    Effect.withSpan('useCase.deletePodcast', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
