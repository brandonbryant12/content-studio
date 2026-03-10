import { Queue, QueueError, type QueueService } from '@repo/queue';
import {
  createTestUser,
  createTestSource,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Source, JobId, JobStatus } from '@repo/db/schema';
import {
  createMockSourceRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { DeepResearchFeatureLive } from '../../services/deep-research-feature';
import { createFromResearch } from '../create-from-research';

interface MockState {
  inserted?: Source;
}

const createMockQueue = (options?: {
  onEnqueue?: (type: string, payload: unknown, userId: string) => void;
  shouldFail?: boolean;
}): Layer.Layer<Queue> => {
  const service: QueueService = {
    enqueue: (type, payload, userId) =>
      options?.shouldFail
        ? Effect.fail(new QueueError({ message: 'Queue down' }))
        : Effect.sync(() => {
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

describe('createFromResearch', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('creates a research source and enqueues processing', async () => {
    const user = createTestUser();
    const state: MockState = {};
    const insertSpy = vi.fn();
    const enqueueSpy = vi.fn();

    const repo = createMockSourceRepo({
      insert: (data) =>
        Effect.sync(() => {
          insertSpy(data);
          const doc = createTestSource({
            title: data.title,
            source: data.source,
            status: data.status,
            createdBy: data.createdBy,
            contentKey: data.contentKey,
            mimeType: data.mimeType,
            researchConfig: data.researchConfig,
          });
          state.inserted = doc;
          return doc;
        }),
      updateStatus: (id, status, errorMessage) =>
        Effect.sync(() => {
          if (!state.inserted || state.inserted.id !== id) {
            throw new Error('updateStatus called with unknown source');
          }
          const updated = {
            ...state.inserted,
            status,
            errorMessage: errorMessage ?? null,
          } satisfies Source;
          state.inserted = updated;
          return updated;
        }),
      findById: (id) =>
        state.inserted && state.inserted.id === id
          ? Effect.succeed(state.inserted)
          : Effect.die('not found'),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      DeepResearchFeatureLive(true),
      repo,
      createMockQueue({ onEnqueue: enqueueSpy }),
    );

    const result = await Effect.runPromise(
      withTestUser(user)(
        createFromResearch({ query: 'what is test automation' }).pipe(
          Effect.provide(layers),
        ),
      ),
    );

    expect(result.source).toBe('research');
    expect(result.status).toBe('processing');
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    const [type, payload, userId] = enqueueSpy.mock.calls[0]!;
    expect(type).toBe('process-research');
    expect(payload.sourceId).toBe(result.id);
    expect(payload.query).toBe('what is test automation');
    expect(payload.userId).toBe(user.id);
    expect(userId).toBe(user.id);
  });

  it('derives a title from the query when not provided', async () => {
    const user = createTestUser();
    const insertSpy = vi.fn();

    const repo = createMockSourceRepo({
      insert: (data) =>
        Effect.sync(() => {
          insertSpy(data);
          return createTestSource({
            title: data.title,
            source: data.source,
            status: data.status,
            createdBy: data.createdBy,
            contentKey: data.contentKey,
            mimeType: data.mimeType,
            researchConfig: data.researchConfig,
          });
        }),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      DeepResearchFeatureLive(true),
      repo,
      createMockQueue(),
    );

    await Effect.runPromise(
      withTestUser(user)(
        createFromResearch({ query: 'how to design podcasts' }).pipe(
          Effect.provide(layers),
        ),
      ),
    );

    expect(insertSpy).toHaveBeenCalledTimes(1);
    const insertData = insertSpy.mock.calls[0]![0];
    expect(insertData.title).toBe('Research: how to design podcasts');
  });

  it('persists auto-generate podcast flag in researchConfig when requested', async () => {
    const user = createTestUser();
    const insertSpy = vi.fn();

    const repo = createMockSourceRepo({
      insert: (data) =>
        Effect.sync(() => {
          insertSpy(data);
          return createTestSource({
            title: data.title,
            source: data.source,
            status: data.status,
            createdBy: data.createdBy,
            contentKey: data.contentKey,
            mimeType: data.mimeType,
            researchConfig: data.researchConfig,
          });
        }),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      DeepResearchFeatureLive(true),
      repo,
      createMockQueue(),
    );

    await Effect.runPromise(
      withTestUser(user)(
        createFromResearch({
          query: 'how to repurpose one article for many formats',
          autoGeneratePodcast: true,
        }).pipe(Effect.provide(layers)),
      ),
    );

    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy.mock.calls[0]?.[0].researchConfig).toEqual(
      expect.objectContaining({
        autoGeneratePodcast: true,
      }),
    );
  });

  it('marks the source as failed when enqueue fails', async () => {
    const user = createTestUser();
    const state: MockState = {};
    const updateStatusSpy = vi.fn();

    const repo = createMockSourceRepo({
      insert: (data) =>
        Effect.sync(() => {
          const doc = createTestSource({
            title: data.title,
            source: data.source,
            status: data.status,
            createdBy: data.createdBy,
            contentKey: data.contentKey,
            mimeType: data.mimeType,
            researchConfig: data.researchConfig,
          });
          state.inserted = doc;
          return doc;
        }),
      updateStatus: (id, status, errorMessage) =>
        Effect.sync(() => {
          updateStatusSpy(id, status, errorMessage);
          return {
            ...state.inserted!,
            status,
            errorMessage: errorMessage ?? null,
          } satisfies Source;
        }),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      DeepResearchFeatureLive(true),
      repo,
      createMockQueue({ shouldFail: true }),
    );

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        createFromResearch({ query: 'queue failure test' }).pipe(
          Effect.provide(layers),
        ),
      ),
    );

    expect(result._tag).toBe('Failure');
    expect(updateStatusSpy).toHaveBeenCalled();
    const [, status, errorMessage] = updateStatusSpy.mock.calls[0]!;
    expect(status).toBe('failed');
    expect(String(errorMessage)).toContain('Queue down');
  });

  it('fails when deep research is disabled', async () => {
    const user = createTestUser();
    const insertSpy = vi.fn();

    const layers = Layer.mergeAll(
      MockDbLive,
      DeepResearchFeatureLive(false),
      createMockSourceRepo({
        insert: (data) =>
          Effect.sync(() => {
            insertSpy(data);
            return createTestSource({
              title: data.title,
              source: data.source,
              status: data.status,
              createdBy: data.createdBy,
              contentKey: data.contentKey,
              mimeType: data.mimeType,
              researchConfig: data.researchConfig,
            });
          }),
      }),
      createMockQueue(),
    );

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        createFromResearch({ query: 'disabled flag test' }).pipe(
          Effect.provide(layers),
        ),
      ),
    );

    expect(result._tag).toBe('Failure');
    expect(insertSpy).not.toHaveBeenCalled();
    if (result._tag === 'Failure' && result.cause._tag === 'Fail') {
      const error = result.cause.error as { _tag?: string };
      expect(error._tag).toBe('DeepResearchDisabled');
    }
  });
});
