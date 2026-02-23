import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { CreatePodcast } from '@repo/db/schema';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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

    const podcast = yield* podcastRepo.insert(
      { ...data, createdBy: user.id },
      documentIds ?? [],
    );
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: podcast.id,
      attributes: { 'podcast.id': podcast.id },
    });
    return podcast;
  }).pipe(withUseCaseSpan('useCase.createPodcast'));
