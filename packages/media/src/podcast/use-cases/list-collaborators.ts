import { Effect } from 'effect';
import type { CollaboratorWithUser, PodcastId } from '@repo/db/schema';
import { CollaboratorRepo } from '../repos/collaborator-repo';

// =============================================================================
// Types
// =============================================================================

export interface ListCollaboratorsInput {
  podcastId: string;
}

export interface ListCollaboratorsResult {
  collaborators: readonly CollaboratorWithUser[];
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * List all collaborators for a podcast.
 *
 * This use case:
 * 1. Loads all collaborators for the podcast with user info
 *
 * @example
 * const result = yield* listCollaborators({
 *   podcastId: 'pod_abc123',
 * });
 * // result.collaborators
 */
export const listCollaborators = (input: ListCollaboratorsInput) =>
  Effect.gen(function* () {
    const collaboratorRepo = yield* CollaboratorRepo;

    const collaborators = yield* collaboratorRepo.findByPodcast(
      input.podcastId as PodcastId,
    );

    return { collaborators };
  }).pipe(
    Effect.withSpan('useCase.listCollaborators', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
