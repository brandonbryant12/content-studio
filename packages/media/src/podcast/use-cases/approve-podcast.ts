import { Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { defineRoleUseCase } from '../../shared';
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
export const approvePodcast = defineRoleUseCase<ApprovePodcastInput>()({
  name: 'useCase.approvePodcast',
  role: Role.ADMIN,
  span: ({ input }) => ({
    resourceId: input.podcastId,
    attributes: { 'podcast.id': input.podcastId },
  }),
  run: ({ input, user }) =>
    Effect.gen(function* () {
      const podcastRepo = yield* PodcastRepo;

      // Verify podcast exists
      yield* podcastRepo.findById(input.podcastId);

      // Set approval
      const updatedPodcast = yield* podcastRepo.setApproval(
        input.podcastId,
        user.id,
      );

      return { podcast: updatedPodcast };
    }),
});
