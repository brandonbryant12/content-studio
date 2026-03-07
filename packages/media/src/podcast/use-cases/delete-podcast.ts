import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
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

export const deletePodcast = defineAuthedUseCase<DeletePodcastInput>()({
  name: 'useCase.deletePodcast',
  span: ({ input }) => ({
    resourceId: input.podcastId,
    attributes: { 'podcast.id': input.podcastId },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const podcastRepo = yield* PodcastRepo;
      yield* podcastRepo.findByIdForUser(input.podcastId, user.id);

      yield* podcastRepo.delete(input.podcastId);
    }),
});
