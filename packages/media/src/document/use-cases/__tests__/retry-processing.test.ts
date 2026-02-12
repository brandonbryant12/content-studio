import { ForbiddenError } from '@repo/auth';
import { Queue, type QueueService } from '@repo/queue';
import {
  createTestUser,
  createTestDocument,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { JobId, JobStatus, Document } from '@repo/db/schema';
import { DocumentAlreadyProcessing, DocumentNotFound } from '../../../errors';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { DocumentRepo, type DocumentRepoService } from '../../repos';
import { retryProcessing } from '../retry-processing';

const createMockDocumentRepo = (
  doc: Document | null,
  options?: {
    onUpdateStatus?: (
      id: string,
      status: string,
      errorMessage?: string,
    ) => void;
  },
): Layer.Layer<DocumentRepo> => {
  const service: DocumentRepoService = {
    findById: (id) =>
      Effect.suspend(() =>
        doc ? Effect.succeed(doc) : Effect.fail(new DocumentNotFound({ id })),
      ),
    insert: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    updateStatus: (id, status, errorMessage) =>
      Effect.sync(() => {
        options?.onUpdateStatus?.(id, status, errorMessage);
        return {
          ...doc!,
          status,
          errorMessage: errorMessage ?? null,
        } as Document;
      }),
    updateContent: () => Effect.die('not implemented'),
    findBySourceUrl: () => Effect.die('not implemented'),
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
    claimNextJob: () => Effect.die('not implemented'),
    failStaleJobs: () => Effect.die('not implemented'),
  };

  return Layer.succeed(Queue, service);
};

describe('retryProcessing', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('happy path', () => {
    it('retries a failed URL document', async () => {
      const user = createTestUser();
      const doc = createTestDocument({
        createdBy: user.id,
        source: 'url',
        sourceUrl: 'https://example.com/article',
        status: 'failed',
        errorMessage: 'Network timeout',
      });

      const enqueueSpy = vi.fn();
      const updateStatusSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo(doc, { onUpdateStatus: updateStatusSpy }),
        createMockQueue({ onEnqueue: enqueueSpy }),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          retryProcessing({ id: doc.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(updateStatusSpy).toHaveBeenCalled();
      expect(updateStatusSpy.mock.calls[0]![0]).toBe(doc.id);
      expect(updateStatusSpy.mock.calls[0]![1]).toBe('processing');
      expect(enqueueSpy).toHaveBeenCalledWith(
        'process-url',
        {
          documentId: doc.id,
          url: 'https://example.com/article',
          userId: user.id,
        },
        user.id,
      );
      expect(result).toBeDefined();
    });

    it('retries a failed research document', async () => {
      const user = createTestUser();
      const doc = createTestDocument({
        createdBy: user.id,
        source: 'research',
        researchConfig: { query: 'climate change effects' },
        status: 'failed',
        errorMessage: 'Research timeout',
      });

      const enqueueSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo(doc),
        createMockQueue({ onEnqueue: enqueueSpy }),
      );

      await Effect.runPromise(
        withTestUser(user)(
          retryProcessing({ id: doc.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(enqueueSpy).toHaveBeenCalledWith(
        'process-research',
        {
          documentId: doc.id,
          query: 'climate change effects',
          userId: user.id,
        },
        user.id,
      );
    });
  });

  describe('validation', () => {
    it('fails when document is in processing status', async () => {
      const user = createTestUser();
      const doc = createTestDocument({
        createdBy: user.id,
        source: 'url',
        sourceUrl: 'https://example.com/article',
        status: 'processing',
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo(doc),
        createMockQueue(),
      );

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          retryProcessing({ id: doc.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(DocumentAlreadyProcessing);
      }
    });

    it('fails with DocumentNotFound for non-existent document', async () => {
      const user = createTestUser();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo(null),
        createMockQueue(),
      );

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          retryProcessing({ id: 'non-existent-id' }).pipe(
            Effect.provide(layers),
          ),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(DocumentNotFound);
      }
    });

    it('returns document when already in ready status (no-op)', async () => {
      const user = createTestUser();
      const doc = createTestDocument({
        createdBy: user.id,
        source: 'url',
        sourceUrl: 'https://example.com/article',
        status: 'ready',
      });

      const enqueueSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo(doc),
        createMockQueue({ onEnqueue: enqueueSpy }),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          retryProcessing({ id: doc.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.id).toBe(doc.id);
      expect(result.status).toBe('ready');
      expect(enqueueSpy).not.toHaveBeenCalled();
    });
  });

  describe('authorization', () => {
    it('fails when user does not own the document', async () => {
      const user = createTestUser({ id: 'user-1' });
      const doc = createTestDocument({
        createdBy: 'other-user',
        source: 'url',
        sourceUrl: 'https://example.com/article',
        status: 'failed',
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo(doc),
        createMockQueue(),
      );

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          retryProcessing({ id: doc.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(ForbiddenError);
      }
    });
  });

  describe('job type dispatch', () => {
    it('enqueues process-url for URL source documents', async () => {
      const user = createTestUser();
      const doc = createTestDocument({
        createdBy: user.id,
        source: 'url',
        sourceUrl: 'https://example.com/page',
        status: 'failed',
      });

      const enqueueSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo(doc),
        createMockQueue({ onEnqueue: enqueueSpy }),
      );

      await Effect.runPromise(
        withTestUser(user)(
          retryProcessing({ id: doc.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(enqueueSpy).toHaveBeenCalledTimes(1);
      expect(enqueueSpy.mock.calls[0]![0]).toBe('process-url');
    });

    it('does not enqueue a job for upload source documents', async () => {
      const user = createTestUser();
      const doc = createTestDocument({
        createdBy: user.id,
        source: 'upload_txt',
        status: 'failed',
      });

      const enqueueSpy = vi.fn();
      const updateStatusSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo(doc, { onUpdateStatus: updateStatusSpy }),
        createMockQueue({ onEnqueue: enqueueSpy }),
      );

      await Effect.runPromise(
        withTestUser(user)(
          retryProcessing({ id: doc.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(updateStatusSpy).toHaveBeenCalledWith(
        doc.id,
        'processing',
        undefined,
      );
      expect(enqueueSpy).not.toHaveBeenCalled();
    });

    it('enqueues process-research for research source documents', async () => {
      const user = createTestUser();
      const doc = createTestDocument({
        createdBy: user.id,
        source: 'research',
        researchConfig: { query: 'AI advancements 2024' },
        status: 'failed',
      });

      const enqueueSpy = vi.fn();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo(doc),
        createMockQueue({ onEnqueue: enqueueSpy }),
      );

      await Effect.runPromise(
        withTestUser(user)(
          retryProcessing({ id: doc.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(enqueueSpy).toHaveBeenCalledTimes(1);
      expect(enqueueSpy.mock.calls[0]![0]).toBe('process-research');
    });
  });
});
