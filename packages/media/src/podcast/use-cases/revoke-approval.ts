import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { defineRoleUseCase } from '../../shared';
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
export const revokeApproval = defineRoleUseCase<RevokeApprovalInput>()({
  name: 'useCase.revokeApproval',
  role: Role.ADMIN,
  span: ({ input }) => ({
    resourceId: input.podcastId,
    attributes: { 'podcast.id': input.podcastId },
  }),
  run: ({ input }) =>
    Effect.gen(function* () {
      const podcastRepo = yield* PodcastRepo;

      // Verify podcast exists
      yield* podcastRepo.findById(input.podcastId);

      // Clear approval
      const updatedPodcast = yield* podcastRepo.clearApproval(input.podcastId);

      return { podcast: updatedPodcast };
    }),
});
