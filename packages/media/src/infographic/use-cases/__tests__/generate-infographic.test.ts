import { Queue, type QueueService } from '@repo/queue';
import {
  createTestUser,
  createTestInfographic,
  resetAllFactories,
} from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Infographic, JobId } from '@repo/db/schema';
import { createMockInfographicRepo } from '../../../test-utils/mock-infographic-repo';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { generateInfographic } from '../generate-infographic';

const createMockQueue = () => {
  const enqueueFn = vi
    .fn()
    .mockImplementation((_type, _payload, _userId) =>
      Effect.succeed({ id: 'job_123' as JobId, status: 'pending' as const }),
    );

  const service: QueueService = {
    enqueue: enqueueFn,
    getJob: () => Effect.die('not implemented'),
    getJobsByUser: () => Effect.die('not implemented'),
    updateJobStatus: () => Effect.die('not implemented'),
    processNextJob: () => Effect.die('not implemented'),
    processJobById: () => Effect.die('not implemented'),
    findPendingJobForPodcast: () => Effect.die('not implemented'),
    findPendingJobForVoiceover: () => Effect.die('not implemented'),
    deleteJob: () => Effect.die('not implemented'),
  };

  const layer = Layer.succeed(Queue, service);

  return { layer, enqueueFn };
};

describe('generateInfographic', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('enqueues a job and updates status to generating', async () => {
    const user = createTestUser();
    const infographic = createTestInfographic({
      createdBy: user.id,
      status: 'draft',
    });

    let updatedStatus: string | undefined;
    const repo = createMockInfographicRepo({
      findById: () => Effect.succeed(infographic),
      update: (_id: string, data) => {
        updatedStatus = data.status;
        return Effect.succeed({
          ...infographic,
          ...data,
        } as Infographic);
      },
    });

    const { layer: queueLayer, enqueueFn } = createMockQueue();
    const layers = Layer.mergeAll(MockDbLive, repo, queueLayer);

    const result = await Effect.runPromise(
      withTestUser(user)(generateInfographic({ id: infographic.id })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result.jobId).toBe('job_123');
    expect(result.status).toBe('pending');
    expect(updatedStatus).toBe('generating');
    expect(enqueueFn).toHaveBeenCalledWith(
      'generate-infographic',
      {
        infographicId: infographic.id,
        userId: user.id,
      },
      user.id,
    );
  });

  it('fails when owned by another user', async () => {
    const user = createTestUser();
    const otherUser = createTestUser();
    const infographic = createTestInfographic({
      createdBy: otherUser.id,
    });

    const repo = createMockInfographicRepo({
      findById: () => Effect.succeed(infographic),
    });
    const { layer: queueLayer } = createMockQueue();
    const layers = Layer.mergeAll(MockDbLive, repo, queueLayer);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(generateInfographic({ id: infographic.id })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result._tag).toBe('Failure');
  });
});
