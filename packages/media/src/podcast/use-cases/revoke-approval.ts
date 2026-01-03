import { Effect } from 'effect';
import type { Podcast } from '@repo/db/schema';
import { PodcastRepo } from '../repos/podcast-repo';
import { CollaboratorRepo } from '../repos/collaborator-repo';
import { NotPodcastCollaborator } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface RevokeApprovalInput {
  podcastId: string;
  userId: string; // User ID of the person revoking approval
}

export interface RevokeApprovalResult {
  podcast: Podcast;
  isOwner: boolean;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Revoke approval on a podcast as an owner or collaborator.
 *
 * This use case:
 * 1. Verifies the user is either the owner or a collaborator
 * 2. If owner, sets ownerHasApproved=false on the podcast
 * 3. If collaborator, sets hasApproved=false on the collaborator record
 *
 * @example
 * const result = yield* revokeApproval({
 *   podcastId: 'pod_abc123',
 *   userId: 'user-123',
 * });
 * // result.podcast, result.isOwner
 */
export const revokeApproval = (input: RevokeApprovalInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const collaboratorRepo = yield* CollaboratorRepo;

    // 1. Load podcast
    const podcast = yield* podcastRepo.findById(input.podcastId);

    // 2. Check if user is owner
    const isOwner = podcast.createdBy === input.userId;

    if (isOwner) {
      // 3a. Owner revoke - set ownerHasApproved=false
      const updatedPodcast = yield* podcastRepo.setOwnerApproval(
        input.podcastId,
        false,
      );
      return { podcast: updatedPodcast, isOwner: true };
    }

    // 3b. Check if user is a collaborator
    const collaborator = yield* collaboratorRepo.findByPodcastAndUser(
      podcast.id,
      input.userId,
    );

    if (!collaborator) {
      return yield* Effect.fail(
        new NotPodcastCollaborator({
          podcastId: input.podcastId,
          userId: input.userId,
        }),
      );
    }

    // 4. Revoke collaborator approval
    yield* collaboratorRepo.revokeApproval(podcast.id, input.userId);

    return { podcast, isOwner: false };
  }).pipe(
    Effect.withSpan('useCase.revokeApproval', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
