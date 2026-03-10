import { Effect } from 'effect';
import type { UpdatePodcast } from '@repo/db/schema';
import { defineAuthedUseCase } from '../../shared';
import { sanitizePodcastEpisodePlan } from '../episode-plan';
import { PodcastRepo } from '../repos/podcast-repo';
import { sanitizePodcastSetupInstructions } from '../setup-instructions';

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
      const existing = yield* podcastRepo.findByIdForUser(
        input.podcastId,
        user.id,
      );

      const sanitizedEpisodePlan = sanitizePodcastEpisodePlan(
        input.data.episodePlan,
        {
          allowedSourceIds: existing.sourceIds,
        },
      );

      const setupInstructions =
        input.data.setupInstructions === undefined
          ? undefined
          : sanitizePodcastSetupInstructions(input.data.setupInstructions);

      const data = {
        ...input.data,
        ...(input.data.episodePlan === undefined
          ? {}
          : { episodePlan: sanitizedEpisodePlan }),
        ...(setupInstructions === undefined ? {} : { setupInstructions }),
      };

      return yield* podcastRepo.update(input.podcastId, data);
    }),
});
