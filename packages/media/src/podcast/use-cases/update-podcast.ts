import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { UpdatePodcast } from '@repo/db/schema';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { PodcastRepo } from '../repos/podcast-repo';

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

export const updatePodcast = (input: UpdatePodcastInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const podcastRepo = yield* PodcastRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.podcastId,
      attributes: { 'podcast.id': input.podcastId },
    });
    yield* podcastRepo.findByIdForUser(input.podcastId, user.id);

    return yield* podcastRepo.update(input.podcastId, input.data);
  }).pipe(withUseCaseSpan('useCase.updatePodcast'));
