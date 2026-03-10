import { DeepResearchFeatureLive } from '@repo/media';
import {
  createMockSourceRepo,
  createMockPodcastRepo,
  createMockVoiceoverRepo,
  createMockInfographicRepo,
  MockDbLive,
} from '@repo/media/test-utils';
import {
  Queue,
  type QueueService,
  type Job,
  type ProcessResearchPayload,
} from '@repo/queue';
import { createTestSource, resetAllFactories } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobId, JobStatus } from '@repo/db/schema';
import {
  publishJobCompletionEvent,
  reapAndRecoverResearch,
} from '../unified-worker';

const createMockQueue = (options: {
  staleJobs: Job[];
  onEnqueue?: (type: string, payload: unknown, userId: string) => void;
  jobsByUser?: QueueService['getJobsByUser'];
}): Layer.Layer<Queue> => {
  const service: QueueService = {
    enqueue: (type, payload, userId) =>
      Effect.sync(() => {
        options.onEnqueue?.(type, payload, userId);
        return {
          id: 'job_requeued' as JobId,
          type,
          status: 'pending' as JobStatus,
          payload,
          result: null,
          error: null,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          startedAt: null,
          completedAt: null,
        };
      }),
    getJob: () => Effect.die('not implemented'),
    getJobsByUser: options.jobsByUser ?? (() => Effect.succeed([])),
    updateJobStatus: () => Effect.die('not implemented'),
    processNextJob: () => Effect.die('not implemented'),
    processJobById: () => Effect.die('not implemented'),
    findPendingJobForPodcast: () => Effect.die('not implemented'),
    findPendingJobForVoiceover: () => Effect.die('not implemented'),
    claimNextJob: () => Effect.die('not implemented'),
    deleteJob: () => Effect.die('not implemented'),
    failStaleJobs: () => Effect.succeed(options.staleJobs),
  };

  return Layer.succeed(Queue, service);
};

describe('reapAndRecoverResearch', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('re-enqueues stale deep research jobs without requiring a worker restart', async () => {
    const enqueueSpy = vi.fn();
    const updateStatusSpy = vi.fn(() => Effect.succeed({} as never));
    const publishSpy = vi.fn();

    const orphan = createTestSource({
      source: 'research',
      status: 'failed',
      createdBy: 'user_1',
      researchConfig: {
        query: 'genome editing policy',
        operationId: 'op-123',
        researchStatus: 'in_progress',
      },
    });

    const staleJob: Job = {
      id: 'job_stale_research' as JobId,
      type: 'process-research',
      status: 'failed' as JobStatus,
      payload: {
        sourceId: orphan.id,
        query: orphan.researchConfig!.query,
        userId: orphan.createdBy,
      },
      result: null,
      error: 'Job timed out: worker did not complete within 300s',
      createdBy: orphan.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
      completedAt: new Date(),
    };

    const layers = Layer.mergeAll(
      createMockQueue({
        staleJobs: [staleJob],
        onEnqueue: enqueueSpy,
      }),
      createMockSourceRepo({
        findById: () =>
          Effect.succeed({
            status: 'processing',
          } as never),
        findOrphanedResearch: () => Effect.succeed([orphan]),
        updateStatus: updateStatusSpy,
      }),
      createMockPodcastRepo(),
      createMockVoiceoverRepo(),
      createMockInfographicRepo(),
      DeepResearchFeatureLive(true),
      MockDbLive,
    );

    await Effect.runPromise(
      reapAndRecoverResearch(publishSpy, 300_000).pipe(Effect.provide(layers)),
    );

    expect(updateStatusSpy).toHaveBeenCalledWith(
      orphan.id,
      'failed',
      expect.stringContaining('timed out'),
    );
    expect(updateStatusSpy).toHaveBeenCalledWith(orphan.id, 'processing');
    expect(enqueueSpy).toHaveBeenCalledWith(
      'process-research',
      expect.objectContaining({
        sourceId: orphan.id,
        query: 'genome editing policy',
        userId: 'user_1',
      }),
      'user_1',
    );
  });
});

describe('publishJobCompletionEvent', () => {
  it('publishes source completion and entity change for completed research jobs', () => {
    const publishSpy = vi.fn();
    const completedJob: Job<ProcessResearchPayload> = {
      id: 'job_completed_research' as JobId,
      type: 'process-research',
      status: 'completed' as JobStatus,
      payload: {
        sourceId: 'doc_research_ready',
        query: 'strategic identity policy',
        userId: 'user_1',
      },
      result: {
        sourceId: 'doc_research_ready',
        wordCount: 3200,
      },
      error: null,
      createdBy: 'user_1',
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
      completedAt: new Date(),
    };

    publishJobCompletionEvent(publishSpy, completedJob);

    expect(publishSpy).toHaveBeenCalledTimes(2);
    expect(publishSpy).toHaveBeenNthCalledWith(
      1,
      'user_1',
      expect.objectContaining({
        type: 'source_job_completion',
        jobId: 'job_completed_research',
        jobType: 'process-research',
        status: 'completed',
        sourceId: 'doc_research_ready',
      }),
    );
    expect(publishSpy).toHaveBeenNthCalledWith(
      2,
      'user_1',
      expect.objectContaining({
        type: 'entity_change',
        entityType: 'source',
        entityId: 'doc_research_ready',
      }),
    );
  });
});
