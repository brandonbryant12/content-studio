import {
  createMockInfographicRepo,
  createMockPodcastRepo,
  createMockSourceRepo,
  createMockVoiceoverRepo,
  MockDbLive,
} from '@repo/media/test-utils';
import { Effect, Layer } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { JobId, JobStatus } from '@repo/db/schema';
import type { Job } from '@repo/queue';
import { syncFailedEntityStateForJob } from '../entity-failure';

const createTestJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job_test_1' as JobId,
  type: 'generate-podcast',
  status: 'failed' as JobStatus,
  payload: {
    podcastId: 'pod_1',
    userId: 'user_1',
  },
  result: null,
  error: 'boom',
  createdBy: 'user_1',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  startedAt: new Date('2024-01-01T00:00:00Z'),
  completedAt: new Date('2024-01-01T00:01:00Z'),
  ...overrides,
});

describe('syncFailedEntityStateForJob', () => {
  it('marks podcast jobs as failed with the provided message', async () => {
    const updateStatusSpy = vi.fn(() => Effect.succeed({} as never));

    const layers = Layer.mergeAll(
      createMockPodcastRepo({ updateStatus: updateStatusSpy }),
      createMockSourceRepo(),
      createMockVoiceoverRepo(),
      createMockInfographicRepo(),
      MockDbLive,
    );

    await Effect.runPromise(
      syncFailedEntityStateForJob(
        createTestJob(),
        'Podcast generation failed',
      ).pipe(Effect.provide(layers)),
    );

    expect(updateStatusSpy).toHaveBeenCalledWith(
      'pod_1',
      'failed',
      'Podcast generation failed',
    );
  });

  it('marks source jobs as failed with the provided message', async () => {
    const updateStatusSpy = vi.fn(() => Effect.succeed({} as never));

    const layers = Layer.mergeAll(
      createMockPodcastRepo(),
      createMockSourceRepo({
        findById: () =>
          Effect.succeed({
            status: 'processing',
          } as never),
        updateStatus: updateStatusSpy,
      }),
      createMockVoiceoverRepo(),
      createMockInfographicRepo(),
      MockDbLive,
    );

    await Effect.runPromise(
      syncFailedEntityStateForJob(
        createTestJob({
          type: 'process-url',
          payload: {
            sourceId: 'src_1',
            userId: 'user_1',
          },
        }),
        'Source processing failed',
      ).pipe(Effect.provide(layers)),
    );

    expect(updateStatusSpy).toHaveBeenCalledWith(
      'src_1',
      'failed',
      'Source processing failed',
    );
  });

  it('does not overwrite a source that is already ready', async () => {
    const updateStatusSpy = vi.fn(() => Effect.succeed({} as never));

    const layers = Layer.mergeAll(
      createMockPodcastRepo(),
      createMockSourceRepo({
        findById: () =>
          Effect.succeed({
            status: 'ready',
          } as never),
        updateStatus: updateStatusSpy,
      }),
      createMockVoiceoverRepo(),
      createMockInfographicRepo(),
      MockDbLive,
    );

    await Effect.runPromise(
      syncFailedEntityStateForJob(
        createTestJob({
          type: 'process-research',
          payload: {
            sourceId: 'src_ready',
            userId: 'user_1',
          },
        }),
        'Late stale failure',
      ).pipe(Effect.provide(layers)),
    );

    expect(updateStatusSpy).not.toHaveBeenCalled();
  });

  it('marks voiceover jobs as failed with the provided message', async () => {
    const updateStatusSpy = vi.fn(() => Effect.succeed({} as never));

    const layers = Layer.mergeAll(
      createMockPodcastRepo(),
      createMockSourceRepo(),
      createMockVoiceoverRepo({ updateStatus: updateStatusSpy }),
      createMockInfographicRepo(),
      MockDbLive,
    );

    await Effect.runPromise(
      syncFailedEntityStateForJob(
        createTestJob({
          type: 'generate-voiceover',
          payload: {
            voiceoverId: 'voc_1',
            userId: 'user_1',
          },
        }),
        'Voiceover generation failed',
      ).pipe(Effect.provide(layers)),
    );

    expect(updateStatusSpy).toHaveBeenCalledWith(
      'voc_1',
      'failed',
      'Voiceover generation failed',
    );
  });

  it('marks infographic jobs as failed with the provided message', async () => {
    const updateSpy = vi.fn(() => Effect.succeed({} as never));

    const layers = Layer.mergeAll(
      createMockPodcastRepo(),
      createMockSourceRepo(),
      createMockVoiceoverRepo(),
      createMockInfographicRepo({ update: updateSpy }),
      MockDbLive,
    );

    await Effect.runPromise(
      syncFailedEntityStateForJob(
        createTestJob({
          type: 'generate-infographic',
          payload: {
            infographicId: 'inf_1',
            userId: 'user_1',
          },
        }),
        'Infographic generation failed',
      ).pipe(Effect.provide(layers)),
    );

    expect(updateSpy).toHaveBeenCalledWith('inf_1', {
      status: 'failed',
      errorMessage: 'Infographic generation failed',
    });
  });
});
