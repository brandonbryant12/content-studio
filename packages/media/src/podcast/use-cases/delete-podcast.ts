import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
import { PodcastRepo } from '../repos/podcast-repo';

// =============================================================================
// Types
// =============================================================================

export interface DeletePodcastInput {
  podcastId: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const deletePodcast = (input: DeletePodcastInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const podcastRepo = yield* PodcastRepo;

    yield* podcastRepo.findByIdForUser(input.podcastId, user.id);
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.podcastId,
      attributes: { 'podcast.id': input.podcastId },
    });

    yield* podcastRepo.delete(input.podcastId);
  }).pipe(Effect.withSpan('useCase.deletePodcast'));
