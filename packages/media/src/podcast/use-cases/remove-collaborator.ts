import { Effect } from 'effect';
import type { CollaboratorId } from '@repo/db/schema';
import { requireOwnership } from '@repo/auth/policy';
import { PodcastRepo } from '../repos/podcast-repo';
import { CollaboratorRepo } from '../repos/collaborator-repo';
import { CollaboratorNotFound } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface RemoveCollaboratorInput {
  collaboratorId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Remove a collaborator from a podcast.
 *
 * This use case:
 * 1. Looks up the collaborator to find the podcast
 * 2. Verifies the current user is the podcast owner (via FiberRef)
 * 3. Deletes the collaborator record
 *
 * @example
 * yield* removeCollaborator({
 *   collaboratorId: 'col_abc123',
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

    // 2. Load podcast and verify ownership via FiberRef
    const podcast = yield* podcastRepo.findById(collaborator.podcastId);
    yield* requireOwnership(podcast.createdBy);

    // 3. Delete the collaborator
    yield* collaboratorRepo.remove(collaborator.id);
  }).pipe(
    Effect.withSpan('useCase.removeCollaborator', {
      attributes: { 'collaborator.id': input.collaboratorId },
    }),
  );
