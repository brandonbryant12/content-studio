import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { PodcastRepo } from '../repos/podcast-repo';

export interface GetPodcastInput {
  podcastId: string;
}

export const getPodcast = defineAuthedUseCase<GetPodcastInput>()({
  name: 'useCase.getPodcast',
  span: ({ input }) => ({
    resourceId: input.podcastId,
    attributes: { 'podcast.id': input.podcastId },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const podcastRepo = yield* PodcastRepo;
      return yield* user.role === Role.ADMIN
        ? podcastRepo.findById(input.podcastId)
        : podcastRepo.findByIdForUser(input.podcastId, user.id);
    }),
});
