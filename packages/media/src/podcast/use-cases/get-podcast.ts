import { Effect } from 'effect';
import { requireOwnership } from '@repo/auth/policy';
import { PodcastRepo } from '../repos/podcast-repo';

export interface GetPodcastInput {
  podcastId: string;
}

export const getPodcast = (input: GetPodcastInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const podcast = yield* podcastRepo.findById(input.podcastId);
    yield* requireOwnership(podcast.createdBy);
    return podcast;
  }).pipe(
    Effect.withSpan('useCase.getPodcast', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
