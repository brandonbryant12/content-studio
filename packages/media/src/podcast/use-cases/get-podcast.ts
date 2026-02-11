import { Effect } from 'effect';
import { PodcastRepo } from '../repos/podcast-repo';

export interface GetPodcastInput {
  podcastId: string;
}

export const getPodcast = (input: GetPodcastInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    return yield* podcastRepo.findById(input.podcastId);
  }).pipe(
    Effect.withSpan('useCase.getPodcast', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
