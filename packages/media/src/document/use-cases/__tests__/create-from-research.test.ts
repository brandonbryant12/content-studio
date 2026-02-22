import { Queue, QueueError, type QueueService } from '@repo/queue';
import {
  createTestUser,
  createTestDocument,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Document, JobId, JobStatus } from '@repo/db/schema';
import {
  createMockDocumentRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { createFromResearch } from '../create-from-research';

interface MockState {
  inserted?: Document;
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

  it('creates a research document and enqueues processing', async () => {
    const user = createTestUser();
    const state: MockState = {};
    const insertSpy = vi.fn();
    const enqueueSpy = vi.fn();

    const repo = createMockDocumentRepo({
      insert: (data) =>
        Effect.sync(() => {
          insertSpy(data);
          const doc = createTestDocument({
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
            throw new Error('updateStatus called with unknown document');
          }
          const updated = {
            ...state.inserted,
            status,
            errorMessage: errorMessage ?? null,
          } satisfies Document;
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
    expect(payload.documentId).toBe(result.id);
    expect(payload.query).toBe('what is test automation');
    expect(payload.userId).toBe(user.id);
    expect(userId).toBe(user.id);
  });

  it('derives a title from the query when not provided', async () => {
    const user = createTestUser();
    const insertSpy = vi.fn();

    const repo = createMockDocumentRepo({
      insert: (data) =>
        Effect.sync(() => {
          insertSpy(data);
          return createTestDocument({
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

    const layers = Layer.mergeAll(MockDbLive, repo, createMockQueue());

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

  it('marks the document as failed when enqueue fails', async () => {
    const user = createTestUser();
    const state: MockState = {};
    const updateStatusSpy = vi.fn();

    const repo = createMockDocumentRepo({
      insert: (data) =>
        Effect.sync(() => {
          const doc = createTestDocument({
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
          } satisfies Document;
        }),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
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
});
