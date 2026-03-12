import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import {
  generateEpisodePlanForPodcast,
  PodcastPlanSourcesNotReadyError,
} from '../episode-plan-generation';
import { PodcastRepo } from '../repos/podcast-repo';

export interface GeneratePodcastPlanInput {
  podcastId: string;
}

export const generatePodcastPlan =
  defineAuthedUseCase<GeneratePodcastPlanInput>()({
    name: 'useCase.generatePodcastPlan',
    span: ({ input }) => ({
      resourceId: input.podcastId,
      attributes: { 'podcast.id': input.podcastId },
    }),
    run: ({ input, user }) =>
      Effect.gen(function* () {
        const podcastRepo = yield* PodcastRepo;
        const podcast = yield* podcastRepo.findByIdForUser(
          input.podcastId,
          user.id,
        );
        const episodePlan = yield* generateEpisodePlanForPodcast({ podcast });

        return yield* podcastRepo.update(podcast.id, {
          episodePlan,
        });
      }),
  });

export { PodcastPlanSourcesNotReadyError };
