import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { PodcastRepo } from '../repos/podcast-repo';

export interface GetPodcastInput {
  podcastId: string;
}

export const getPodcast = (input: GetPodcastInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const podcastRepo = yield* PodcastRepo;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.podcastId,
      attributes: { 'podcast.id': input.podcastId },
    });
    const podcast = yield* podcastRepo.findByIdForUser(
      input.podcastId,
      user.id,
    );
    return podcast;
  }).pipe(withUseCaseSpan('useCase.getPodcast'));
