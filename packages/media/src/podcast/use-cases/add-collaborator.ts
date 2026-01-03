import { Effect } from 'effect';
import type { CollaboratorWithUser } from '@repo/db/schema';
import { PodcastRepo } from '../repos/podcast-repo';
import { CollaboratorRepo } from '../repos/collaborator-repo';
import {
  NotPodcastOwner,
  CollaboratorAlreadyExists,
  CannotAddOwnerAsCollaborator,
} from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface AddCollaboratorInput {
  podcastId: string;
  email: string;
  addedBy: string; // User ID of the person adding the collaborator
}

export interface AddCollaboratorResult {
  collaborator: CollaboratorWithUser;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Add a collaborator to a podcast.
 *
 * This use case:
 * 1. Verifies the addedBy user is the podcast owner
 * 2. Checks if the email is the owner's email (cannot add owner as collaborator)
 * 3. Checks if a collaborator with this email already exists
 * 4. Looks up if the email belongs to an existing user
 * 5. Creates the collaborator record
 *
 * @example
 * const result = yield* addCollaborator({
 *   podcastId: 'pod_abc123',
 *   email: 'collaborator@example.com',
 *   addedBy: 'user-123',
 * });
 * // result.collaborator
 */
export const addCollaborator = (input: AddCollaboratorInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const collaboratorRepo = yield* CollaboratorRepo;

    // 1. Load podcast and verify ownership
    const podcast = yield* podcastRepo.findById(input.podcastId);

    if (podcast.createdBy !== input.addedBy) {
      return yield* Effect.fail(
        new NotPodcastOwner({
          podcastId: input.podcastId,
          userId: input.addedBy,
        }),
      );
    }

    // 2. Look up if the email belongs to an existing user
    // We need to check the user table to see if there's a user with this email
    // and to ensure we're not adding the owner as a collaborator
    const userInfo = yield* collaboratorRepo.lookupUserByEmail(input.email);

    // 3. Check if this is the owner's email
    if (userInfo && userInfo.id === podcast.createdBy) {
      return yield* Effect.fail(
        new CannotAddOwnerAsCollaborator({
          podcastId: input.podcastId,
          email: input.email,
        }),
      );
    }

    // 4. Check if collaborator already exists
    const existing = yield* collaboratorRepo.findByPodcastAndEmail(
      podcast.id,
      input.email,
    );

    if (existing) {
      return yield* Effect.fail(
        new CollaboratorAlreadyExists({
          podcastId: input.podcastId,
          email: input.email,
        }),
      );
    }

    // 5. Create the collaborator
    const collaborator = yield* collaboratorRepo.add({
      podcastId: podcast.id,
      email: input.email,
      userId: userInfo?.id,
      addedBy: input.addedBy,
    });

    // Return with user info
    const result: CollaboratorWithUser = {
      ...collaborator,
      userName: userInfo?.name ?? null,
      userImage: userInfo?.image ?? null,
    };

    return { collaborator: result };
  }).pipe(
    Effect.withSpan('useCase.addCollaborator', {
      attributes: {
        'podcast.id': input.podcastId,
        'collaborator.email': input.email,
      },
    }),
  );
