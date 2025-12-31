import { Effect } from 'effect';
import type { CreatePodcast } from '@repo/db/schema';
import type { Db, DatabaseError } from '@repo/db/effect';
import { DocumentNotFound } from '@repo/db/errors';
import { PodcastRepo, type PodcastFull } from '../repos/podcast-repo';
import { ScriptVersionRepo } from '../repos/script-version-repo';

// =============================================================================
// Types
// =============================================================================

export interface CreatePodcastInput extends CreatePodcast {
  userId: string;
}

export type CreatePodcastError = DatabaseError | DocumentNotFound;

// =============================================================================
// Use Case
// =============================================================================

/**
 * Create a new podcast with an initial draft version.
 *
 * This use case:
 * 1. Validates document ownership if documentIds provided
 * 2. Creates the podcast record
 * 3. Creates an initial drafting version (no script content)
 * 4. Returns the full podcast with active version
 *
 * @example
 * const podcast = yield* createPodcast({
 *   format: 'conversation',
 *   documentIds: ['doc-1', 'doc-2'],
 *   userId: 'user-123',
 * });
 */
export const createPodcast = (
  input: CreatePodcastInput,
): Effect.Effect<PodcastFull, CreatePodcastError, PodcastRepo | ScriptVersionRepo | Db> =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const scriptVersionRepo = yield* ScriptVersionRepo;

    const { userId, documentIds, ...data } = input;

    // 1. Validate documents if provided
    if (documentIds && documentIds.length > 0) {
      yield* podcastRepo.verifyDocumentsExist(documentIds, userId);
    }

    // 2. Create podcast
    const podcastWithDocs = yield* podcastRepo.insert(
      { ...data, createdBy: userId },
      documentIds ?? [],
    );

    // 3. Create initial drafting version
    const draftVersion = yield* scriptVersionRepo.insert({
      podcastId: podcastWithDocs.id,
      status: 'drafting',
      segments: null,
    });

    // 4. Return full podcast with active version
    return {
      ...podcastWithDocs,
      activeVersion: draftVersion,
    };
  }).pipe(
    Effect.withSpan('useCase.createPodcast', {
      attributes: { 'user.id': input.userId },
    }),
  );
