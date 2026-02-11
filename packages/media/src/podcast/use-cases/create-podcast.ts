import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { CreatePodcast } from '@repo/db/schema';
import { PodcastRepo } from '../repos/podcast-repo';

// =============================================================================
// Types
// =============================================================================

export type CreatePodcastInput = CreatePodcast;

// =============================================================================
// Use Case
// =============================================================================

export const createPodcast = (input: CreatePodcastInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const podcastRepo = yield* PodcastRepo;

    const { documentIds, ...data } = input;

    if (documentIds && documentIds.length > 0) {
      yield* podcastRepo.verifyDocumentsExist(documentIds, user.id);
    }

    return yield* podcastRepo.insert(
      { ...data, createdBy: user.id },
      documentIds ?? [],
    );
  }).pipe(Effect.withSpan('useCase.createPodcast'));
