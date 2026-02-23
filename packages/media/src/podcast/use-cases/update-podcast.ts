import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { UpdatePodcast } from '@repo/db/schema';
import { annotateUseCaseSpan } from '../../shared';
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
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.podcastId,
    });
    const podcastRepo = yield* PodcastRepo;

    yield* podcastRepo.findByIdForUser(input.podcastId, user.id);

    return yield* podcastRepo.update(input.podcastId, input.data);
  }).pipe(
    Effect.withSpan('useCase.updatePodcast', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
