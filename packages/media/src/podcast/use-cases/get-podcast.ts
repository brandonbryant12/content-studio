import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { PodcastRepo } from '../repos/podcast-repo';

export interface GetPodcastInput {
  podcastId: string;
  userId?: string;
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
      const ownerId =
        user.role === Role.ADMIN ? (input.userId ?? user.id) : user.id;

      return yield* podcastRepo.findByIdForUser(input.podcastId, ownerId);
    }),
});
