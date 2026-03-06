import { Effect } from 'effect';
import type { CreatePodcast } from '@repo/db/schema';
import { defineAuthedUseCase } from '../../shared';
import { PodcastRepo } from '../repos/podcast-repo';

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

      if (sourceIds.length > 0) {
        yield* podcastRepo.verifySourcesExist(sourceIds, user.id);
      }

      const podcast = yield* podcastRepo.insert(
        { ...data, createdBy: user.id },
        sourceIds,
      );

      yield* annotateSpan({
        resourceId: podcast.id,
        attributes: { 'podcast.id': podcast.id },
      });

      return podcast;
    }),
});
