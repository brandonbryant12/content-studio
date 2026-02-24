import { createMockTTS } from '@repo/ai/testing';
import { createMockStorage } from '@repo/storage/testing';
import {
  createTestUser,
  createScriptReadyPodcast,
  createTestPodcast,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PodcastWithDocuments } from '../../repos/podcast-repo';
import type { Podcast } from '@repo/db/schema';
import {
  createMockPodcastRepo,
  createMockPersonaRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { generateAudio } from '../generate-audio';

describe('generateAudio', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('generates audio for script-ready podcasts', async () => {
    const user = createTestUser();
    const podcast = {
      ...createScriptReadyPodcast({ createdBy: user.id }),
      documents: [],
    } satisfies PodcastWithDocuments;
    const updateStatusSpy = vi.fn();
    const updateAudioSpy = vi.fn();

    const repo = createMockPodcastRepo({
      findByIdForUser: () => Effect.succeed(podcast),
      updateStatus: (id, status, errorMessage) =>
        Effect.sync(() => {
          updateStatusSpy(id, status, errorMessage);
          return { ...podcast, status, errorMessage: errorMessage ?? null };
        }),
      updateAudio: (id, data) =>
        Effect.sync(() => {
          updateAudioSpy(id, data);
          return { ...podcast, ...data };
        }),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      repo,
      createMockPersonaRepo(),
      createMockTTS(),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
    );

    const result = await Effect.runPromise(
      withTestUser(user)(
        generateAudio({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result.audioUrl).toContain('podcasts/');
    expect(result.duration).toBeGreaterThan(0);
    expect(updateStatusSpy).toHaveBeenCalledWith(
      podcast.id,
      'generating_audio',
      undefined,
    );
    expect(updateStatusSpy).toHaveBeenCalledWith(
      podcast.id,
      'ready',
      undefined,
    );
    expect(updateAudioSpy).toHaveBeenCalledWith(podcast.id, {
      audioUrl: expect.any(String),
      duration: expect.any(Number),
    });
  });

  it('fails when podcast status is invalid', async () => {
    const user = createTestUser();
    const podcast = {
      ...createTestPodcast({
        createdBy: user.id,
        status: 'drafting',
        segments: [],
      }),
      documents: [],
    } satisfies PodcastWithDocuments;

    const repo = createMockPodcastRepo({
      findByIdForUser: () => Effect.succeed(podcast),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      repo,
      createMockPersonaRepo(),
      createMockTTS(),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
    );

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        generateAudio({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('InvalidAudioGenerationError');
    }
  });

  it('fails when podcast has no segments', async () => {
    const user = createTestUser();
    const podcast = {
      ...createTestPodcast({
        createdBy: user.id,
        status: 'script_ready',
        segments: [],
      }),
      documents: [],
    } satisfies PodcastWithDocuments;

    const repo = createMockPodcastRepo({
      findByIdForUser: () => Effect.succeed(podcast),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      repo,
      createMockPersonaRepo(),
      createMockTTS(),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
    );

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        generateAudio({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('InvalidAudioGenerationError');
    }
  });

  it('marks the podcast failed when TTS fails', async () => {
    const user = createTestUser();
    const podcast = {
      ...createScriptReadyPodcast({ createdBy: user.id }),
      documents: [],
    } satisfies PodcastWithDocuments;
    const updateStatusSpy = vi.fn();

    const repo = createMockPodcastRepo({
      findByIdForUser: () => Effect.succeed(podcast),
      updateStatus: (id, status, errorMessage) =>
        Effect.sync(() => {
          updateStatusSpy(id, status, errorMessage);
          return { ...podcast, status, errorMessage: errorMessage ?? null };
        }),
      updateAudio: () => Effect.succeed(podcast as Podcast),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      repo,
      createMockPersonaRepo(),
      createMockTTS({ errorMessage: 'TTS failed' }),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
    );

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        generateAudio({ podcastId: podcast.id }).pipe(Effect.provide(layers)),
      ),
    );

    expect(result._tag).toBe('Failure');
    const lastCall = updateStatusSpy.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    if (lastCall) {
      const [, status, errorMessage] = lastCall;
      expect(status).toBe('failed');
      expect(String(errorMessage)).toContain('TTS failed');
    }
  });
});
