import {
  recommendPodcastTargetDurationMinutes,
  type CreatePodcast,
} from '@repo/db/schema';
import { Effect } from 'effect';
import { defineAuthedUseCase } from '../../shared';
import { PodcastRepo } from '../repos/podcast-repo';
import { sanitizePodcastSetupInstructions } from '../setup-instructions';

// =============================================================================
// Types
// =============================================================================

export type CreatePodcastInput = CreatePodcast;

// =============================================================================
// Use Case
// =============================================================================

export const createPodcast = defineAuthedUseCase<CreatePodcastInput>()({
  name: 'useCase.createPodcast',
  run: ({ input, user, annotateSpan }) =>
    Effect.gen(function* () {
      const podcastRepo = yield* PodcastRepo;

      const { sourceIds: inputSourceIds, ...data } = input;
      const sourceIds = inputSourceIds ?? [];
      const sanitizedSetupInstructions = sanitizePodcastSetupInstructions(
        data.setupInstructions,
      );
      const setupInstructions =
        sanitizedSetupInstructions === null
          ? undefined
          : sanitizedSetupInstructions;
      const verifiedSources =
        sourceIds.length > 0
          ? yield* podcastRepo.verifySourcesExist(sourceIds, user.id)
          : [];
      const recommendedTargetDurationMinutes =
        data.targetDurationMinutes === undefined
          ? (recommendPodcastTargetDurationMinutes({
              totalSourceWords: verifiedSources.reduce(
                (sum, source) => sum + source.wordCount,
                0,
              ),
              sourceCount: verifiedSources.length,
            }) ?? undefined)
          : data.targetDurationMinutes;

      const podcast = yield* podcastRepo.insert(
        {
          ...data,
          setupInstructions,
          targetDurationMinutes: recommendedTargetDurationMinutes,
          createdBy: user.id,
        },
        sourceIds,
      );

      yield* annotateSpan({
        resourceId: podcast.id,
        attributes: { 'podcast.id': podcast.id },
      });

      return podcast;
    }),
});
