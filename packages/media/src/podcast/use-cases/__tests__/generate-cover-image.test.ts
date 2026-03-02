import { createMockImageGen } from '@repo/ai/testing';
import { createMockStorage } from '@repo/storage/testing';
import {
  createTestPodcast,
  createTestUser,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PodcastWithDocuments } from '../../repos/podcast-repo';
import type { Podcast } from '@repo/db/schema';
import {
  createMockPodcastRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { generateCoverImage } from '../generate-cover-image';

describe('generateCoverImage', () => {
  let testUser: ReturnType<typeof createTestUser>;

  beforeEach(() => {
    resetAllFactories();
    testUser = createTestUser();
  });

  it('uploads and stores a cover image for the podcast', async () => {
    const podcast = {
      ...createTestPodcast(),
      documents: [],
    } satisfies PodcastWithDocuments;
    const updateSpy = vi.fn();

    const repo = createMockPodcastRepo({
      findById: () => Effect.succeed(podcast),
      update: (id, data) =>
        Effect.sync(() => {
          updateSpy(id, data);
          return { ...podcast, ...data } as Podcast;
        }),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      repo,
      createMockImageGen(),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
    );

    await Effect.runPromise(
      withTestUser(testUser)(
        generateCoverImage({ podcastId: podcast.id }).pipe(
          Effect.provide(layers),
        ),
      ),
    );

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [, data] = updateSpy.mock.calls[0]!;
    expect(data.coverImageStorageKey).toBe(`podcasts/${podcast.id}/cover.png`);
  });

  it('propagates image generation failures', async () => {
    const podcast = {
      ...createTestPodcast(),
      documents: [],
    } satisfies PodcastWithDocuments;

    const repo = createMockPodcastRepo({
      findById: () => Effect.succeed(podcast),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      repo,
      createMockImageGen({ shouldRejectContent: true }),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
    );

    const result = await Effect.runPromiseExit(
      withTestUser(testUser)(
        generateCoverImage({ podcastId: podcast.id }).pipe(
          Effect.provide(layers),
        ),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure' && result.cause._tag === 'Fail') {
      expect(result.cause.error._tag).toBe('ImageGenError');
    }
  });
});
