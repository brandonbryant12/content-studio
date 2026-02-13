import { Queue, type QueueService } from '@repo/queue';
import {
  createMockDocumentRepo,
  createMockPodcastRepo,
  createMockVoiceoverRepo,
  createMockInfographicRepo,
  MockDbLive,
} from '@repo/media/test-utils';
import { createTestDocument, resetAllFactories } from '@repo/testing';
import type { JobId, JobStatus, Document } from '@repo/db/schema';
import { Effect, Layer } from 'effect';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recoverOrphanedResearch } from '../research-recovery';

// =============================================================================
// Test Helpers
// =============================================================================

const createMockQueue = (options?: {
  onEnqueue?: (type: string, payload: unknown, userId: string) => void;
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
    getJobsByUser: () => Effect.die('not implemented'),
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
      createMockDocumentRepo({
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

  it('resets document status and enqueues job for each orphan', async () => {
    const publishSpy = vi.fn();
    const enqueueSpy = vi.fn();
    const updateStatusSpy = vi.fn(() => Effect.succeed({} as never));

    const orphan1 = createTestDocument({
      source: 'research',
      status: 'failed',
      createdBy: 'user_1',
      researchConfig: {
        query: 'quantum computing',
        operationId: 'op-111',
        researchStatus: 'in_progress',
      },
    });

    const orphan2 = createTestDocument({
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
      createMockDocumentRepo({
        findOrphanedResearch: () => Effect.succeed([orphan1, orphan2]),
        updateStatus: updateStatusSpy,
      }),
      createMockQueue({ onEnqueue: enqueueSpy }),
      baseRepoLayers,
    );

    await Effect.runPromise(
      recoverOrphanedResearch(publishSpy).pipe(Effect.provide(layers)),
    );

    // Should reset both documents to processing
    expect(updateStatusSpy).toHaveBeenCalledTimes(2);
    expect(updateStatusSpy).toHaveBeenCalledWith(orphan1.id, 'processing');
    expect(updateStatusSpy).toHaveBeenCalledWith(orphan2.id, 'processing');

    // Should enqueue process-research jobs for both
    expect(enqueueSpy).toHaveBeenCalledTimes(2);
    expect(enqueueSpy).toHaveBeenCalledWith(
      'process-research',
      expect.objectContaining({
        documentId: orphan1.id,
        query: 'quantum computing',
        userId: 'user_1',
      }),
      'user_1',
    );
    expect(enqueueSpy).toHaveBeenCalledWith(
      'process-research',
      expect.objectContaining({
        documentId: orphan2.id,
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
        entityType: 'document',
        entityId: orphan1.id,
      }),
    );
  });

  it('swallows errors gracefully (does not throw)', async () => {
    const publishSpy = vi.fn();

    const layers = Layer.mergeAll(
      createMockDocumentRepo({
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
});
