import { Queue, type QueueService, type Job } from '@repo/queue';
import {
  createMockDocumentRepo,
  createMockPodcastRepo,
  createMockVoiceoverRepo,
  createMockInfographicRepo,
  MockDbLive,
} from '@repo/media/test-utils';
import type { JobId, JobStatus } from '@repo/db/schema';
import { Effect, Layer } from 'effect';
import { describe, it, expect, vi } from 'vitest';
import { reapStaleJobs } from '../stale-job-reaper';

// =============================================================================
// Test Helpers
// =============================================================================

const createTestJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job_test_1' as JobId,
  type: 'process-url',
  status: 'failed' as JobStatus,
  payload: {
    documentId: 'doc_1',
    url: 'https://example.com',
    userId: 'user_1',
  },
  result: null,
  error: 'Job timed out: worker did not complete within 900s',
  createdBy: 'user_1',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  startedAt: new Date('2024-01-01T00:00:00Z'),
  completedAt: new Date('2024-01-01T00:10:00Z'),
  ...overrides,
});

const createMockQueue = (
  staleJobs: Job[],
  failStaleJobsSpy?: ReturnType<typeof vi.fn>,
): Layer.Layer<Queue> => {
  const spy = failStaleJobsSpy ?? vi.fn();
  const service: QueueService = {
    enqueue: () => Effect.die('not implemented'),
    getJob: () => Effect.die('not implemented'),
    getJobsByUser: () => Effect.die('not implemented'),
    updateJobStatus: () => Effect.die('not implemented'),
    claimNextJob: () => Effect.die('not implemented'),
    processNextJob: () => Effect.die('not implemented'),
    processJobById: () => Effect.die('not implemented'),
    findPendingJobForPodcast: () => Effect.die('not implemented'),
    findPendingJobForVoiceover: () => Effect.die('not implemented'),
    deleteJob: () => Effect.die('not implemented'),
    failStaleJobs: (maxAgeMs) => {
      spy(maxAgeMs);
      return Effect.succeed(staleJobs);
    },
  };

  return Layer.succeed(Queue, service);
};

const noopPublish = vi.fn();

const baseRepoLayers = Layer.mergeAll(
  createMockDocumentRepo(),
  createMockPodcastRepo(),
  createMockVoiceoverRepo(),
  createMockInfographicRepo(),
  MockDbLive,
);

// =============================================================================
// Tests
// =============================================================================

describe('reapStaleJobs', () => {
  it('does nothing when no stale jobs exist', async () => {
    const publishSpy = vi.fn();

    await Effect.runPromise(
      reapStaleJobs(publishSpy).pipe(
        Effect.provide(createMockQueue([])),
        Effect.provide(baseRepoLayers),
      ),
    );

    expect(publishSpy).not.toHaveBeenCalled();
  });

  it('updates document status to failed for document jobs', async () => {
    const updateStatusSpy = vi.fn(() => Effect.succeed({} as never));
    const publishSpy = vi.fn();

    const staleJob = createTestJob({
      type: 'process-url',
      payload: {
        documentId: 'doc_abc',
        url: 'https://x.com',
        userId: 'user_1',
      },
    });

    const layers = Layer.mergeAll(
      createMockQueue([staleJob]),
      createMockDocumentRepo({ updateStatus: updateStatusSpy }),
      createMockPodcastRepo(),
      createMockVoiceoverRepo(),
      createMockInfographicRepo(),
      MockDbLive,
    );

    await Effect.runPromise(
      reapStaleJobs(publishSpy).pipe(Effect.provide(layers)),
    );

    expect(updateStatusSpy).toHaveBeenCalledWith(
      'doc_abc',
      'failed',
      expect.stringContaining('timed out'),
    );
    expect(publishSpy).toHaveBeenCalledWith(
      'user_1',
      expect.objectContaining({
        type: 'entity_change',
        entityType: 'document',
        entityId: 'doc_abc',
      }),
    );
  });

  it('updates podcast status to failed for podcast jobs', async () => {
    const updateStatusSpy = vi.fn(() => Effect.succeed({} as never));
    const publishSpy = vi.fn();

    const staleJob = createTestJob({
      type: 'generate-podcast',
      payload: { podcastId: 'pod_abc', userId: 'user_2' },
    });

    const layers = Layer.mergeAll(
      createMockQueue([staleJob]),
      createMockDocumentRepo(),
      createMockPodcastRepo({ updateStatus: updateStatusSpy }),
      createMockVoiceoverRepo(),
      createMockInfographicRepo(),
      MockDbLive,
    );

    await Effect.runPromise(
      reapStaleJobs(publishSpy).pipe(Effect.provide(layers)),
    );

    expect(updateStatusSpy).toHaveBeenCalledWith(
      'pod_abc',
      'failed',
      expect.stringContaining('timed out'),
    );
    expect(publishSpy).toHaveBeenCalledWith(
      'user_2',
      expect.objectContaining({
        type: 'entity_change',
        entityType: 'podcast',
        entityId: 'pod_abc',
      }),
    );
  });

  it('updates voiceover status to failed for voiceover jobs', async () => {
    const updateStatusSpy = vi.fn(() => Effect.succeed({} as never));
    const publishSpy = vi.fn();

    const staleJob = createTestJob({
      type: 'generate-voiceover',
      payload: { voiceoverId: 'voc_abc', userId: 'user_3' },
    });

    const layers = Layer.mergeAll(
      createMockQueue([staleJob]),
      createMockDocumentRepo(),
      createMockPodcastRepo(),
      createMockVoiceoverRepo({ updateStatus: updateStatusSpy }),
      createMockInfographicRepo(),
      MockDbLive,
    );

    await Effect.runPromise(
      reapStaleJobs(publishSpy).pipe(Effect.provide(layers)),
    );

    expect(updateStatusSpy).toHaveBeenCalledWith(
      'voc_abc',
      'failed',
      expect.stringContaining('timed out'),
    );
    expect(publishSpy).toHaveBeenCalledWith(
      'user_3',
      expect.objectContaining({
        type: 'entity_change',
        entityType: 'voiceover',
        entityId: 'voc_abc',
      }),
    );
  });

  it('updates infographic via update() for infographic jobs', async () => {
    const updateSpy = vi.fn(() => Effect.succeed({} as never));
    const publishSpy = vi.fn();

    const staleJob = createTestJob({
      type: 'generate-infographic',
      payload: { infographicId: 'inf_abc', userId: 'user_4' },
    });

    const layers = Layer.mergeAll(
      createMockQueue([staleJob]),
      createMockDocumentRepo(),
      createMockPodcastRepo(),
      createMockVoiceoverRepo(),
      createMockInfographicRepo({ update: updateSpy }),
      MockDbLive,
    );

    await Effect.runPromise(
      reapStaleJobs(publishSpy).pipe(Effect.provide(layers)),
    );

    expect(updateSpy).toHaveBeenCalledWith(
      'inf_abc',
      expect.objectContaining({
        status: 'failed',
        errorMessage: expect.stringContaining('timed out'),
      }),
    );
    expect(publishSpy).toHaveBeenCalledWith(
      'user_4',
      expect.objectContaining({
        type: 'entity_change',
        entityType: 'infographic',
        entityId: 'inf_abc',
      }),
    );
  });

  it('handles multiple stale jobs across entity types', async () => {
    const docUpdateSpy = vi.fn(() => Effect.succeed({} as never));
    const podUpdateSpy = vi.fn(() => Effect.succeed({} as never));
    const publishSpy = vi.fn();

    const staleJobs = [
      createTestJob({
        id: 'job_1' as JobId,
        type: 'process-url',
        payload: {
          documentId: 'doc_1',
          url: 'https://x.com',
          userId: 'user_1',
        },
      }),
      createTestJob({
        id: 'job_2' as JobId,
        type: 'generate-podcast',
        payload: { podcastId: 'pod_1', userId: 'user_1' },
      }),
    ];

    const layers = Layer.mergeAll(
      createMockQueue(staleJobs),
      createMockDocumentRepo({ updateStatus: docUpdateSpy }),
      createMockPodcastRepo({ updateStatus: podUpdateSpy }),
      createMockVoiceoverRepo(),
      createMockInfographicRepo(),
      MockDbLive,
    );

    await Effect.runPromise(
      reapStaleJobs(publishSpy).pipe(Effect.provide(layers)),
    );

    expect(docUpdateSpy).toHaveBeenCalledOnce();
    expect(podUpdateSpy).toHaveBeenCalledOnce();
    expect(publishSpy).toHaveBeenCalledTimes(2);
  });

  it('continues processing when an entity update fails (graceful degradation)', async () => {
    const podUpdateSpy = vi.fn(() => Effect.succeed({} as never));
    const publishSpy = vi.fn();

    const staleJobs = [
      createTestJob({
        id: 'job_1' as JobId,
        type: 'process-url',
        payload: {
          documentId: 'doc_1',
          url: 'https://x.com',
          userId: 'user_1',
        },
      }),
      createTestJob({
        id: 'job_2' as JobId,
        type: 'generate-podcast',
        payload: { podcastId: 'pod_1', userId: 'user_1' },
      }),
    ];

    // Document repo fails, podcast repo succeeds
    const layers = Layer.mergeAll(
      createMockQueue(staleJobs),
      createMockDocumentRepo({
        updateStatus: () =>
          Effect.fail(new Error('DB connection lost') as never),
      }),
      createMockPodcastRepo({ updateStatus: podUpdateSpy }),
      createMockVoiceoverRepo(),
      createMockInfographicRepo(),
      MockDbLive,
    );

    // Should not throw
    await Effect.runPromise(
      reapStaleJobs(publishSpy).pipe(Effect.provide(layers)),
    );

    // Podcast update should still succeed even though document update failed
    expect(podUpdateSpy).toHaveBeenCalledOnce();
  });

  it('passes maxAgeMs to queue.failStaleJobs', async () => {
    const failStaleJobsSpy = vi.fn();

    const layers = Layer.mergeAll(
      createMockQueue([], failStaleJobsSpy),
      baseRepoLayers,
    );

    await Effect.runPromise(
      reapStaleJobs(noopPublish, 30_000).pipe(Effect.provide(layers)),
    );

    expect(failStaleJobsSpy).toHaveBeenCalledWith(30_000);
  });
});
