import { Effect } from 'effect';
import type { UpdatePodcast } from '@repo/db/schema';
import { requireOwnership } from '@repo/auth/policy';
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

    const podcast = yield* podcastRepo.findById(input.podcastId);
    yield* requireOwnership(podcast.createdBy);

    return yield* podcastRepo.update(input.podcastId, input.data);
  }).pipe(
    Effect.withSpan('useCase.updatePodcast', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
