import { Effect } from 'effect';
import type { UpdatePodcast } from '@repo/db/schema';
import { defineAuthedUseCase } from '../../shared';
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

export const updatePodcast = defineAuthedUseCase<UpdatePodcastInput>()({
  name: 'useCase.updatePodcast',
  span: ({ input }) => ({
    resourceId: input.podcastId,
    attributes: { 'podcast.id': input.podcastId },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const podcastRepo = yield* PodcastRepo;
      yield* podcastRepo.findByIdForUser(input.podcastId, user.id);

      return yield* podcastRepo.update(input.podcastId, input.data);
    }),
});
