import { Effect } from 'effect';
import type { CreatePodcast } from '@repo/db/schema';
import { getCurrentUser } from '@repo/auth/policy';
import { PodcastRepo, type PodcastWithDocuments } from '../repos/podcast-repo';

// =============================================================================
// Types
// =============================================================================

export interface CreatePodcastInput extends CreatePodcast {}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Create a new podcast in drafting status.
 *
 * This use case:
 * 1. Gets the current user from FiberRef context
 * 2. Validates document ownership if documentIds provided
 * 3. Creates the podcast record (starts in drafting status)
 * 4. Returns the podcast with resolved documents
 *
 * @example
 * const podcast = yield* createPodcast({
 *   format: 'conversation',
 *   documentIds: ['doc-1', 'doc-2'],
 * });
 */
export const createPodcast = (input: CreatePodcastInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const podcastRepo = yield* PodcastRepo;

    const { documentIds, ...data } = input;

    // 1. Validate documents if provided
    if (documentIds && documentIds.length > 0) {
      yield* podcastRepo.verifyDocumentsExist(documentIds, user.id);
    }

    // 2. Create podcast (starts in drafting status by default)
    const podcastWithDocs = yield* podcastRepo.insert(
      { ...data, createdBy: user.id },
      documentIds ?? [],
    );

    return podcastWithDocs;
  }).pipe(
    Effect.withSpan('useCase.createPodcast'),
  );
