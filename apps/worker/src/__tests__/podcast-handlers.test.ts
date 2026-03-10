import {
  awaitSourcesReady,
  generateAudio,
  generateCoverImage,
  generateScript,
  syncEntityTitle,
} from '@repo/media';
import { createMockPodcastRepo } from '@repo/media/test-utils';
import {
  createTestPodcast,
  createTestSource,
  resetAllFactories,
} from '@repo/testing';
import { Effect } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobId, JobStatus } from '@repo/db/schema';
import type * as Media from '@repo/media';
import type { PodcastWithSources } from '@repo/media';
import type { GeneratePodcastPayload, Job } from '@repo/queue';
import { createGeneratePodcastHandler } from '../handlers/handlers';

vi.mock('@repo/media', async () => {
  const actual = await vi.importActual<typeof Media>('@repo/media');

  return {
    ...actual,
    awaitSourcesReady: vi.fn(() => Effect.void),
    generateAudio: vi.fn(),
    generateCoverImage: vi.fn(() => Effect.void),
    generateScript: vi.fn(),
    syncEntityTitle: vi.fn(() => Effect.void),
  };
});

const createTestJob = (
  payload: GeneratePodcastPayload,
): Job<GeneratePodcastPayload> => ({
  id: 'job_test123' as JobId,
  type: 'generate-podcast',
  status: 'processing' as JobStatus,
  payload,
  result: null,
  error: null,
  createdBy: payload.userId,
  createdAt: new Date(),
  updatedAt: new Date(),
  startedAt: new Date(),
  completedAt: null,
});

describe('createGeneratePodcastHandler', () => {
  beforeEach(() => {
    resetAllFactories();
    vi.clearAllMocks();
  });

  it('publishes an intermediate podcast update after script generation', async () => {
    const queuedPodcast: PodcastWithSources = {
      ...createTestPodcast({
        createdBy: 'user-123',
      }),
      sources: [
        createTestSource({
          createdBy: 'user-123',
          status: 'ready',
        }),
      ],
    };
    const job = createTestJob({
      podcastId: queuedPodcast.id,
      userId: queuedPodcast.createdBy,
    });
    const scriptPodcast = createTestPodcast({
      id: queuedPodcast.id,
      createdBy: job.payload.userId,
      title: 'Generated Episode',
      status: 'script_ready',
    });
    const readyPodcast = createTestPodcast({
      id: queuedPodcast.id,
      createdBy: job.payload.userId,
      title: 'Generated Episode',
      status: 'ready',
    });
    const callOrder: string[] = [];
    const publishEvent = vi.fn((_userId: string, event: { type: string }) => {
      callOrder.push(`publish:${event.type}`);
    });

    vi.mocked(generateScript).mockImplementation(() =>
      Effect.sync(() => {
        callOrder.push('script');
        return {
          podcast: scriptPodcast,
          segmentCount: 3,
        };
      }),
    );
    vi.mocked(syncEntityTitle).mockImplementation(() =>
      Effect.sync(() => {
        callOrder.push('title');
      }),
    );
    vi.mocked(generateCoverImage).mockImplementation(() =>
      Effect.sync(() => {
        callOrder.push('cover');
      }),
    );
    vi.mocked(generateAudio).mockImplementation(() =>
      Effect.sync(() => {
        callOrder.push('audio');
        return {
          podcast: readyPodcast,
          audioUrl: 'https://audio.example.com/podcast.wav',
          duration: 42,
        };
      }),
    );

    const handler = createGeneratePodcastHandler(publishEvent);
    const effect = handler(job).pipe(
      Effect.provide(
        createMockPodcastRepo({
          findById: () => Effect.succeed(queuedPodcast),
        }),
      ),
    ) as Effect.Effect<unknown, unknown, never>;

    await Effect.runPromise(effect);

    expect(vi.mocked(awaitSourcesReady)).not.toHaveBeenCalled();
    expect(publishEvent).toHaveBeenCalledWith(
      job.payload.userId,
      expect.objectContaining({
        type: 'entity_change',
        entityType: 'podcast',
        entityId: job.payload.podcastId,
      }),
    );
    expect(callOrder.indexOf('script')).toBeGreaterThanOrEqual(0);
    expect(callOrder.indexOf('publish:entity_change')).toBeGreaterThan(
      callOrder.indexOf('script'),
    );
    expect(callOrder.indexOf('publish:entity_change')).toBeLessThan(
      callOrder.indexOf('audio'),
    );
  });
});
