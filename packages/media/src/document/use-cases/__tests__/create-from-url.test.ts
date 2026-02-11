import { Queue, QueueError, type QueueService } from '@repo/queue';
import {
  createTestUser,
  createTestDocument,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { JobId, JobStatus, Document } from '@repo/db/schema';
import { DocumentAlreadyProcessing, InvalidUrlError } from '../../../errors';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { DocumentRepo, type DocumentRepoService } from '../../repos';
import { createFromUrl } from '../create-from-url';

interface MockDocState {
  existingByUrl?: Document | null;
  insertedDoc?: Document;
}

const createMockDocumentRepo = (
  state: MockDocState,
  options?: {
    onInsert?: (data: unknown) => void;
    onDelete?: (id: string) => void;
  },
): Layer.Layer<DocumentRepo> => {
  const service: DocumentRepoService = {
    findById: (id) =>
      state.insertedDoc && state.insertedDoc.id === id
        ? Effect.succeed(state.insertedDoc)
        : Effect.die(`findById not mocked for id ${id}`),
    insert: (data) =>
      Effect.sync(() => {
        options?.onInsert?.(data);
        const doc = createTestDocument({
          title: data.title,
          source: data.source,
          sourceUrl: data.sourceUrl ?? undefined,
          status: data.status,
          createdBy: data.createdBy,
          mimeType: data.mimeType,
          contentKey: data.contentKey,
        });
        state.insertedDoc = doc;
        return doc;
      }),
    list: () => Effect.die('not implemented'),
    update: (id) =>
      state.insertedDoc
        ? Effect.succeed(state.insertedDoc)
        : Effect.die('update not mocked'),
    delete: (id) =>
      Effect.sync(() => {
        options?.onDelete?.(id);
        return true;
      }),
    count: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateContent: () => Effect.die('not implemented'),
    findBySourceUrl: () =>
      Effect.suspend(() => Effect.succeed(state.existingByUrl ?? null)),
    updateResearchConfig: () => Effect.die('not implemented'),
  };

  return Layer.succeed(DocumentRepo, service);
};

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
  };

  return Layer.succeed(Queue, service);
};

describe('createFromUrl', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('happy path', () => {
    it('creates document from valid URL', async () => {
      const user = createTestUser();
      const insertSpy = vi.fn();
      const enqueueSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({}, { onInsert: insertSpy }),
        createMockQueue({ onEnqueue: enqueueSpy }),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          createFromUrl({ url: 'https://example.com/article' }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(result).toBeDefined();
      expect(result.source).toBe('url');
      expect(result.status).toBe('processing');
      expect(insertSpy).toHaveBeenCalledTimes(1);
      expect(enqueueSpy).toHaveBeenCalledTimes(1);
      expect(enqueueSpy.mock.calls[0]![0]).toBe('process-url');
    });

    it('uses custom title when provided', async () => {
      const user = createTestUser();
      const insertSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({}, { onInsert: insertSpy }),
        createMockQueue(),
      );

      await Effect.runPromise(
        withTestUser(user)(
          createFromUrl({
            url: 'https://example.com/article',
            title: 'My Custom Title',
          }).pipe(Effect.provide(layers)),
        ),
      );

      expect(insertSpy).toHaveBeenCalledTimes(1);
      const insertData = insertSpy.mock.calls[0]![0];
      expect(insertData.title).toBe('My Custom Title');
    });

    it('derives title from URL when not provided', async () => {
      const user = createTestUser();
      const insertSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({}, { onInsert: insertSpy }),
        createMockQueue(),
      );

      await Effect.runPromise(
        withTestUser(user)(
          createFromUrl({ url: 'https://example.com/blog/post' }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(insertSpy).toHaveBeenCalledTimes(1);
      const insertData = insertSpy.mock.calls[0]![0];
      expect(insertData.title).toBe('example.com/blog/post');
    });

    it('enqueues process-url job with correct payload', async () => {
      const user = createTestUser();
      const enqueueSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({}),
        createMockQueue({ onEnqueue: enqueueSpy }),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          createFromUrl({ url: 'https://example.com/page' }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(enqueueSpy).toHaveBeenCalledTimes(1);
      const [type, payload, userId] = enqueueSpy.mock.calls[0]!;
      expect(type).toBe('process-url');
      expect(payload.documentId).toBe(result.id);
      expect(payload.url).toBe('https://example.com/page');
      expect(payload.userId).toBe(user.id);
      expect(userId).toBe(user.id);
    });
  });

  describe('deduplication', () => {
    it('returns existing ready document for duplicate URL', async () => {
      const user = createTestUser();
      const existingDoc = createTestDocument({
        createdBy: user.id,
        source: 'url',
        sourceUrl: 'https://example.com/article',
        status: 'ready',
      });

      const enqueueSpy = vi.fn();
      const insertSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo(
          { existingByUrl: existingDoc },
          { onInsert: insertSpy },
        ),
        createMockQueue({ onEnqueue: enqueueSpy }),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          createFromUrl({ url: 'https://example.com/article' }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(result.id).toBe(existingDoc.id);
      expect(insertSpy).not.toHaveBeenCalled();
      expect(enqueueSpy).not.toHaveBeenCalled();
    });

    it('rejects in-progress duplicates with DocumentAlreadyProcessing', async () => {
      const user = createTestUser();
      const existingDoc = createTestDocument({
        createdBy: user.id,
        source: 'url',
        sourceUrl: 'https://example.com/article',
        status: 'processing',
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({ existingByUrl: existingDoc }),
        createMockQueue(),
      );

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          createFromUrl({ url: 'https://example.com/article' }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(DocumentAlreadyProcessing);
      }
    });

    it('deletes failed duplicate and creates new document', async () => {
      const user = createTestUser();
      const failedDoc = createTestDocument({
        createdBy: user.id,
        source: 'url',
        sourceUrl: 'https://example.com/article',
        status: 'failed',
        errorMessage: 'Previous failure',
      });

      const deleteSpy = vi.fn();
      const insertSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo(
          { existingByUrl: failedDoc },
          { onDelete: deleteSpy, onInsert: insertSpy },
        ),
        createMockQueue(),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          createFromUrl({ url: 'https://example.com/article' }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(deleteSpy).toHaveBeenCalledWith(failedDoc.id);
      expect(insertSpy).toHaveBeenCalledTimes(1);
      expect(result.source).toBe('url');
    });
  });

  describe('validation', () => {
    it('rejects invalid URLs', async () => {
      const user = createTestUser();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({}),
        createMockQueue(),
      );

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          createFromUrl({ url: 'not-a-url' }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
      }
    });

    it('rejects private IPs', async () => {
      const user = createTestUser();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({}),
        createMockQueue(),
      );

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          createFromUrl({ url: 'http://127.0.0.1/admin' }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InvalidUrlError);
      }
    });

    it('propagates queue failure after insert (no cleanup)', async () => {
      const user = createTestUser();
      const insertSpy = vi.fn();

      const docState: MockDocState = {};
      const docLayer = createMockDocumentRepo(docState, {
        onInsert: insertSpy,
      });

      const failingQueue = Layer.succeed(Queue, {
        enqueue: () =>
          Effect.fail(new QueueError({ message: 'Queue connection failed' })),
        getJob: () => Effect.die('not implemented'),
        getJobsByUser: () => Effect.die('not implemented'),
        updateJobStatus: () => Effect.die('not implemented'),
        processNextJob: () => Effect.die('not implemented'),
        processJobById: () => Effect.die('not implemented'),
        findPendingJobForPodcast: () => Effect.die('not implemented'),
        findPendingJobForVoiceover: () => Effect.die('not implemented'),
        deleteJob: () => Effect.die('not implemented'),
      } as QueueService);

      const layers = Layer.mergeAll(MockDbLive, docLayer, failingQueue);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          createFromUrl({ url: 'https://example.com/article' }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      // Document was inserted before enqueue failed
      expect(insertSpy).toHaveBeenCalledTimes(1);
      // Error propagates — no cleanup of the orphaned document
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(QueueError);
      }
    });
  });

  describe('initial state', () => {
    it('sets correct initial status and source', async () => {
      const user = createTestUser();
      const insertSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({}, { onInsert: insertSpy }),
        createMockQueue(),
      );

      await Effect.runPromise(
        withTestUser(user)(
          createFromUrl({ url: 'https://example.com/page' }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      const insertData = insertSpy.mock.calls[0]![0];
      expect(insertData.source).toBe('url');
      expect(insertData.status).toBe('processing');
      expect(insertData.sourceUrl).toBe('https://example.com/page');
      expect(insertData.mimeType).toBe('text/plain');
      expect(insertData.wordCount).toBe(0);
      expect(insertData.createdBy).toBe(user.id);
    });
  });
});
