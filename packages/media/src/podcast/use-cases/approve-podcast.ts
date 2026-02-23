import { requireRole, Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
import { PodcastRepo } from '../repos/podcast-repo';

// =============================================================================
// Types
// =============================================================================

export interface ApprovePodcastInput {
  podcastId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Approve a podcast (admin-only).
 *
 * Records who approved it and when.
 */
export const approvePodcast = (input: ApprovePodcastInput) =>
  Effect.gen(function* () {
    const user = yield* requireRole(Role.ADMIN);
    const podcastRepo = yield* PodcastRepo;

    // Verify podcast exists
    yield* podcastRepo.findById(input.podcastId);
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.podcastId,
      attributes: { 'podcast.id': input.podcastId },
    });

    // Set approval
    const updatedPodcast = yield* podcastRepo.setApproval(
      input.podcastId,
      user.id,
    );

    return { podcast: updatedPodcast };
  }).pipe(Effect.withSpan('useCase.approvePodcast'));
