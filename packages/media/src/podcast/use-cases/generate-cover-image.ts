import { ImageGen, podcastCoverImageUserPrompt, renderPrompt } from '@repo/ai';
import { getCurrentUser } from '@repo/auth/policy';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
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
    const imageGen = yield* ImageGen;
    const storage = yield* Storage;
    const podcastRepo = yield* PodcastRepo;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.podcastId,
      attributes: { 'podcast.id': input.podcastId },
    });
    const podcast = yield* podcastRepo.findByIdForUser(
      input.podcastId,
      user.id,
    );

    const prompt = renderPrompt(podcastCoverImageUserPrompt, {
      title: podcast.title,
      description: podcast.description,
      summary: podcast.summary,
    });

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
    withUseCaseSpan('useCase.generateCoverImage'),
  );
