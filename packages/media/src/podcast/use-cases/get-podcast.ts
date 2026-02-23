import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
import { PodcastRepo } from '../repos/podcast-repo';

export interface GetPodcastInput {
  podcastId: string;
}

export const getPodcast = (input: GetPodcastInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.podcastId,
    });
    const podcastRepo = yield* PodcastRepo;
    const podcast = yield* podcastRepo.findByIdForUser(
      input.podcastId,
      user.id,
    );
    return podcast;
  }).pipe(
    Effect.withSpan('useCase.getPodcast', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
