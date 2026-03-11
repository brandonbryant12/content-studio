import {
  recommendPodcastTargetDurationMinutes,
  type UpdatePodcast,
} from '@repo/db/schema';
import { Effect } from 'effect';
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

const haveSameSourceIds = (
  left: readonly string[],
  right: readonly string[],
): boolean =>
  left.length === right.length &&
  left.every((sourceId, index) => sourceId === right[index]);

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
      const nextSourceIds = input.data.sourceIds ?? existing.sourceIds;
      const verifiedSources =
        input.data.sourceIds === undefined
          ? existing.sources
          : yield* podcastRepo.verifySourcesExist(nextSourceIds, user.id);

      const sanitizedEpisodePlan = sanitizePodcastEpisodePlan(
        input.data.episodePlan,
        {
          allowedSourceIds: nextSourceIds,
        },
      );

      const setupInstructions =
        input.data.setupInstructions === undefined
          ? undefined
          : sanitizePodcastSetupInstructions(input.data.setupInstructions);
      const shouldRefreshRecommendedDuration =
        input.data.targetDurationMinutes === undefined &&
        input.data.sourceIds !== undefined &&
        !haveSameSourceIds(existing.sourceIds, nextSourceIds) &&
        existing.hostVoice === null &&
        existing.coHostVoice === null &&
        existing.targetDurationMinutes === 5;
      const recommendedTargetDurationMinutes = shouldRefreshRecommendedDuration
        ? (recommendPodcastTargetDurationMinutes({
            totalSourceWords: verifiedSources.reduce(
              (sum, source) => sum + source.wordCount,
              0,
            ),
            sourceCount: verifiedSources.length,
          }) ?? undefined)
        : undefined;

      const data = {
        ...input.data,
        ...(input.data.sourceIds === undefined
          ? {}
          : { sourceIds: nextSourceIds }),
        ...(input.data.episodePlan === undefined
          ? {}
          : { episodePlan: sanitizedEpisodePlan }),
        ...(setupInstructions === undefined ? {} : { setupInstructions }),
        ...(recommendedTargetDurationMinutes === undefined
          ? {}
          : { targetDurationMinutes: recommendedTargetDurationMinutes }),
      };

      return yield* podcastRepo.update(input.podcastId, data);
    }),
});
