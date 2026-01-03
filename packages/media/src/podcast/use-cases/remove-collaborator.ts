import { Effect } from 'effect';
import type { CollaboratorId } from '@repo/db/schema';
import { PodcastRepo } from '../repos/podcast-repo';
import { CollaboratorRepo } from '../repos/collaborator-repo';
import { NotPodcastOwner, CollaboratorNotFound } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface RemoveCollaboratorInput {
  collaboratorId: string;
  removedBy: string; // User ID of the person removing the collaborator
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Remove a collaborator from a podcast.
 *
 * This use case:
 * 1. Looks up the collaborator to find the podcast
 * 2. Verifies the removedBy user is the podcast owner
 * 3. Deletes the collaborator record
 *
 * @example
 * yield* removeCollaborator({
 *   collaboratorId: 'col_abc123',
 *   removedBy: 'user-123',
 * });
 */
export const removeCollaborator = (input: RemoveCollaboratorInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const collaboratorRepo = yield* CollaboratorRepo;

    // 1. Look up the collaborator to find the podcast
    const collaborator = yield* collaboratorRepo.findById(
      input.collaboratorId as CollaboratorId,
    );

    if (!collaborator) {
      return yield* Effect.fail(
        new CollaboratorNotFound({ id: input.collaboratorId }),
      );
    }

    // 2. Load podcast and verify ownership
    const podcast = yield* podcastRepo.findById(collaborator.podcastId);

    if (podcast.createdBy !== input.removedBy) {
      return yield* Effect.fail(
        new NotPodcastOwner({
          podcastId: collaborator.podcastId,
          userId: input.removedBy,
        }),
      );
    }

    // 3. Delete the collaborator
    yield* collaboratorRepo.remove(collaborator.id);
  }).pipe(
    Effect.withSpan('useCase.removeCollaborator', {
      attributes: { 'collaborator.id': input.collaboratorId },
    }),
  );
