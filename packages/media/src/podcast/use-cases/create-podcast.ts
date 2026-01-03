import { Effect } from 'effect';
import type { CreatePodcast } from '@repo/db/schema';
import { PodcastRepo, type PodcastWithDocuments } from '../repos/podcast-repo';

// =============================================================================
// Types
// =============================================================================

export interface CreatePodcastInput extends CreatePodcast {
  userId: string;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Create a new podcast in drafting status.
 *
 * This use case:
 * 1. Validates document ownership if documentIds provided
 * 2. Creates the podcast record (starts in drafting status)
 * 3. Returns the podcast with resolved documents
 *
 * @example
 * const podcast = yield* createPodcast({
 *   format: 'conversation',
 *   documentIds: ['doc-1', 'doc-2'],
 *   userId: 'user-123',
 * });
 */
export const createPodcast = (input: CreatePodcastInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;

    const { userId, documentIds, ...data } = input;

    // 1. Validate documents if provided
    if (documentIds && documentIds.length > 0) {
      yield* podcastRepo.verifyDocumentsExist(documentIds, userId);
    }

    // 2. Create podcast (starts in drafting status by default)
    const podcastWithDocs = yield* podcastRepo.insert(
      { ...data, createdBy: userId },
      documentIds ?? [],
    );

    return podcastWithDocs;
  }).pipe(
    Effect.withSpan('useCase.createPodcast', {
      attributes: { 'user.id': input.userId },
    }),
  );
