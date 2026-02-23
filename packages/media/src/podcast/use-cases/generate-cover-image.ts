import { ImageGen } from '@repo/ai';
import { getCurrentUser } from '@repo/auth/policy';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
import { PodcastRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface GenerateCoverImageInput {
  podcastId: string;
}

// =============================================================================
// Use Case
// =============================================================================

export const generateCoverImage = (input: GenerateCoverImageInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.podcastId,
    });
    const imageGen = yield* ImageGen;
    const storage = yield* Storage;
    const podcastRepo = yield* PodcastRepo;

    const podcast = yield* podcastRepo.findById(input.podcastId);

    const prompt =
      `Create a podcast cover image for "${podcast.title}". ${podcast.description ?? ''}. ${podcast.summary ?? ''}`.trim();

    const { imageData, mimeType } = yield* imageGen.generateImage({
      prompt,
      format: 'square',
    });

    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const storageKey = `podcasts/${podcast.id}/cover.${ext}`;
    yield* storage.upload(storageKey, imageData, mimeType);

    yield* podcastRepo.update(podcast.id, { coverImageStorageKey: storageKey });
  }).pipe(
    Effect.catchAll(() => Effect.void),
    Effect.withSpan('useCase.generateCoverImage', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
