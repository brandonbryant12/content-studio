import { DeepResearchFeatureLive } from '@repo/media/source';
import {
  createMockSourceRepo,
  createMockPodcastRepo,
  createMockVoiceoverRepo,
  createMockInfographicRepo,
  MockDbLive,
} from '@repo/media/test-utils';
import { Queue, type QueueService } from '@repo/queue';
import { createTestSource, resetAllFactories } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JobId, JobStatus } from '@repo/db/schema';
import { recoverOrphanedResearch } from '../research-recovery';

// =============================================================================
// Test Helpers
// =============================================================================

const createMockQueue = (options?: {
  onEnqueue?: (type: string, payload: unknown, userId: string) => void;
  jobsByUser?: QueueService['getJobsByUser'];
}): Layer.Layer<Queue> => {
  const service: QueueService = {
    enqueue: (type, payload, userId) =>
      Effect.sync(() => {
        options?.onEnqueue?.(type, payload, userId);
        return {
          id: 'job_test123' as JobId,
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
    getJobsByUser: options?.jobsByUser ?? (() => Effect.succeed([])),
    updateJobStatus: () => Effect.die('not implemented'),
    processNextJob: () => Effect.die('not implemented'),
    processJobById: () => Effect.die('not implemented'),
    findPendingJobForPodcast: () => Effect.die('not implemented'),
    findPendingJobForVoiceover: () => Effect.die('not implemented'),
    deleteJob: () => Effect.die('not implemented'),
    claimNextJob: () => Effect.die('not implemented'),
    failStaleJobs: () => Effect.die('not implemented'),
  };
  return Layer.succeed(Queue, service);
};

const baseRepoLayers = Layer.mergeAll(
  createMockPodcastRepo(),
  createMockVoiceoverRepo(),
  createMockInfographicRepo(),
  DeepResearchFeatureLive(true),
  MockDbLive,
);

// =============================================================================
// Tests
// =============================================================================

describe('recoverOrphanedResearch', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('does nothing when no orphaned research docs exist', async () => {
    const publishSpy = vi.fn();
    const enqueueSpy = vi.fn();

    const layers = Layer.mergeAll(
      createMockSourceRepo({
        findOrphanedResearch: () => Effect.succeed([]),
      }),
      createMockQueue({ onEnqueue: enqueueSpy }),
      baseRepoLayers,
    );

    await Effect.runPromise(
      recoverOrphanedResearch(publishSpy).pipe(Effect.provide(layers)),
    );

    expect(enqueueSpy).not.toHaveBeenCalled();
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it('reuses an existing active research job instead of enqueueing a duplicate', async () => {
    const publishSpy = vi.fn();
    const enqueueSpy = vi.fn();
    const updateStatusSpy = vi.fn(() => Effect.succeed({} as never));

    const orphan = createTestSource({
      source: 'research',
      status: 'failed',
      createdBy: 'user_1',
      researchConfig: {
        query: 'quantum computing',
        operationId: 'op-111',
        researchStatus: 'in_progress',
      },
    });

    const layers = Layer.mergeAll(
      createMockSourceRepo({
        findOrphanedResearch: () => Effect.succeed([orphan]),
        updateStatus: updateStatusSpy,
      }),
      createMockQueue({
        onEnqueue: enqueueSpy,
        jobsByUser: () =>
          Effect.succeed([
            {
              id: 'job_existing' as JobId,
              type: 'process-research',
              status: 'processing' as JobStatus,
              payload: {
                sourceId: orphan.id,
                query: orphan.researchConfig!.query,
                userId: orphan.createdBy,
              },
              result: null,
              error: null,
              createdBy: orphan.createdBy,
              createdAt: new Date(),
              updatedAt: new Date(),
              startedAt: new Date(),
              completedAt: null,
            },
          ]),
      }),
      baseRepoLayers,
    );

    await Effect.runPromise(
      recoverOrphanedResearch(publishSpy).pipe(Effect.provide(layers)),
    );

    expect(updateStatusSpy).toHaveBeenCalledWith(orphan.id, 'processing');
    expect(enqueueSpy).not.toHaveBeenCalled();
    expect(publishSpy).toHaveBeenCalledWith(
      orphan.createdBy,
      expect.objectContaining({
        type: 'entity_change',
        entityType: 'source',
        entityId: orphan.id,
      }),
    );
  });

  it('resets source status and enqueues job for each orphan', async () => {
    const publishSpy = vi.fn();
    const enqueueSpy = vi.fn();
    const updateStatusSpy = vi.fn(() => Effect.succeed({} as never));

    const orphan1 = createTestSource({
      source: 'research',
      status: 'failed',
      createdBy: 'user_1',
      researchConfig: {
        query: 'quantum computing',
        operationId: 'op-111',
        researchStatus: 'in_progress',
      },
    });

    const orphan2 = createTestSource({
      source: 'research',
      status: 'processing',
      createdBy: 'user_2',
      researchConfig: {
        query: 'machine learning',
        operationId: 'op-222',
        researchStatus: 'in_progress',
      },
    });

    const layers = Layer.mergeAll(
      createMockSourceRepo({
        findOrphanedResearch: () => Effect.succeed([orphan1, orphan2]),
        updateStatus: updateStatusSpy,
      }),
      createMockQueue({ onEnqueue: enqueueSpy }),
      baseRepoLayers,
    );

    await Effect.runPromise(
      recoverOrphanedResearch(publishSpy).pipe(Effect.provide(layers)),
    );

    // Should reset both sources to processing
    expect(updateStatusSpy).toHaveBeenCalledTimes(2);
    expect(updateStatusSpy).toHaveBeenCalledWith(orphan1.id, 'processing');
    expect(updateStatusSpy).toHaveBeenCalledWith(orphan2.id, 'processing');

    // Should enqueue process-research jobs for both
    expect(enqueueSpy).toHaveBeenCalledTimes(2);
    expect(enqueueSpy).toHaveBeenCalledWith(
      'process-research',
      expect.objectContaining({
        sourceId: orphan1.id,
        query: 'quantum computing',
        userId: 'user_1',
      }),
      'user_1',
    );
    expect(enqueueSpy).toHaveBeenCalledWith(
      'process-research',
      expect.objectContaining({
        sourceId: orphan2.id,
        query: 'machine learning',
        userId: 'user_2',
      }),
      'user_2',
    );

    // Should emit entity_change events
    expect(publishSpy).toHaveBeenCalledTimes(2);
    expect(publishSpy).toHaveBeenCalledWith(
      'user_1',
      expect.objectContaining({
        type: 'entity_change',
        entityType: 'source',
        entityId: orphan1.id,
      }),
    );
  });

  it('swallows errors gracefully (does not throw)', async () => {
    const publishSpy = vi.fn();

    const layers = Layer.mergeAll(
      createMockSourceRepo({
        findOrphanedResearch: () =>
          Effect.fail(new Error('DB connection lost') as never),
      }),
      createMockQueue(),
      baseRepoLayers,
    );

    // Should not throw
    await Effect.runPromise(
      recoverOrphanedResearch(publishSpy).pipe(Effect.provide(layers)),
    );
  });

  it('skips recovery when deep research is disabled', async () => {
    const publishSpy = vi.fn();
    const enqueueSpy = vi.fn();
    const updateStatusSpy = vi.fn(() => Effect.succeed({} as never));

    const orphan = createTestSource({
      source: 'research',
      status: 'processing',
      createdBy: 'user_1',
      researchConfig: {
        query: 'quantum computing',
        operationId: 'op-111',
        researchStatus: 'in_progress',
      },
    });

    const layers = Layer.mergeAll(
      createMockSourceRepo({
        findOrphanedResearch: () => Effect.succeed([orphan]),
        updateStatus: updateStatusSpy,
      }),
      createMockQueue({ onEnqueue: enqueueSpy }),
      createMockPodcastRepo(),
      createMockVoiceoverRepo(),
      createMockInfographicRepo(),
      DeepResearchFeatureLive(false),
      MockDbLive,
    );

    await Effect.runPromise(
      recoverOrphanedResearch(publishSpy).pipe(Effect.provide(layers)),
    );

    expect(updateStatusSpy).not.toHaveBeenCalled();
    expect(enqueueSpy).not.toHaveBeenCalled();
    expect(publishSpy).not.toHaveBeenCalled();
  });
});
