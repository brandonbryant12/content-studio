import { Effect } from 'effect';
import type { UpdatePodcast } from '@repo/db/schema';
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

export const updatePodcast = (input: UpdatePodcastInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;

    yield* podcastRepo.findById(input.podcastId);

    return yield* podcastRepo.update(input.podcastId, input.data);
  }).pipe(
    Effect.withSpan('useCase.updatePodcast', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
