import { requireRole, Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
import { PodcastRepo } from '../repos/podcast-repo';

// =============================================================================
// Types
// =============================================================================

export interface RevokeApprovalInput {
  podcastId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Revoke approval on a podcast (admin-only).
 *
 * Clears approvedBy and approvedAt.
 */
export const revokeApproval = (input: RevokeApprovalInput) =>
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

    // Clear approval
    const updatedPodcast = yield* podcastRepo.clearApproval(input.podcastId);

    return { podcast: updatedPodcast };
  }).pipe(Effect.withSpan('useCase.revokeApproval'));
