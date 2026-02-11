import { Db, DbError } from '@repo/db/effect';
import {
  DocumentRepo,
  type DocumentRepoService,
  UrlScraper,
  type UrlScraperService,
  UrlFetchError,
} from '@repo/media';
import { JobProcessingError } from '@repo/queue';
import {
  Storage,
  type StorageService,
  StorageUploadError,
} from '@repo/storage';
import { createTestDocument, resetAllFactories } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DocumentId, JobId, JobStatus } from '@repo/db/schema';
import type { ProcessUrlPayload, Job } from '@repo/queue';
import { handleProcessUrl } from '../workers/document-handlers';

const MockDbLive = Layer.succeed(Db, { db: {} as never });

const createTestJob = (
  overrides: Partial<Job<ProcessUrlPayload>> = {},
): Job<ProcessUrlPayload> => ({
  id: 'job_test123' as JobId,
  type: 'process-url',
  status: 'processing' as JobStatus,
  payload: {
    documentId: 'doc_test1',
    url: 'https://example.com/article',
    userId: 'user-123',
  },
  result: null,
  error: null,
  createdBy: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  startedAt: new Date(),
  completedAt: null,
  ...overrides,
});

const createMockDocumentRepo = (options?: {
  onUpdateContent?: (id: string, data: unknown) => void;
  onUpdateStatus?: (id: string, status: string, errorMessage?: string) => void;
}): Layer.Layer<DocumentRepo> => {
  const service: DocumentRepoService = {
    insert: () => Effect.die('not implemented'),
    findById: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    updateStatus: (id, status, errorMessage) =>
      Effect.sync(() => {
        options?.onUpdateStatus?.(id, status, errorMessage);
        return createTestDocument({ id: id as DocumentId, status });
      }),
    updateContent: (id, data) =>
      Effect.sync(() => {
        options?.onUpdateContent?.(id, data);
        return createTestDocument({ id: id as DocumentId });
      }),
    findBySourceUrl: () => Effect.die('not implemented'),
    updateResearchConfig: () => Effect.die('not implemented'),
  };

  return Layer.succeed(DocumentRepo, service);
};

const createMockUrlScraper = (
  overrides: Partial<UrlScraperService> = {},
): Layer.Layer<UrlScraper> =>
  Layer.succeed(UrlScraper, {
    fetchAndExtract:
      overrides.fetchAndExtract ??
      (() =>
        Effect.succeed({
          title: 'Test Article',
          content: 'This is test content with several words in it.',
          description: 'A test article description',
          author: 'Test Author',
          publishedAt: '2024-01-15',
          wordCount: 9,
        })),
  });

const createMockStorage = (
  overrides: Partial<StorageService> = {},
): Layer.Layer<Storage> => {
  const service: StorageService = {
    upload: (key) => Effect.succeed(`mock://${key}`),
    download: () => Effect.succeed(Buffer.from('mock')),
    delete: () => Effect.succeed(undefined),
    getUrl: (key) => Effect.succeed(`mock://${key}`),
    exists: () => Effect.succeed(true),
    ...overrides,
  };

  return Layer.succeed(Storage, service);
};

describe('handleProcessUrl', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('success path', () => {
    it('scrapes URL, uploads content, and updates document', async () => {
      const updateContentSpy = vi.fn();
      const updateStatusSpy = vi.fn();
      const job = createTestJob();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({
          onUpdateContent: updateContentSpy,
          onUpdateStatus: updateStatusSpy,
        }),
        createMockUrlScraper(),
        createMockStorage(),
      );

      const result = await Effect.runPromise(
        handleProcessUrl(job).pipe(Effect.provide(layers)),
      );

      expect(result.documentId).toBe('doc_test1');
      expect(result.wordCount).toBe(9);

      // Content was updated
      expect(updateContentSpy).toHaveBeenCalledTimes(1);
      const [contentId, contentData] = updateContentSpy.mock.calls[0]!;
      expect(contentId).toBe('doc_test1');
      expect(contentData.contentKey).toBe('documents/doc_test1/content.txt');
      expect(contentData.extractedText).toBe(
        'This is test content with several words in it.',
      );
      expect(contentData.wordCount).toBe(9);
      expect(contentData.contentHash).toBeDefined();
      expect(typeof contentData.contentHash).toBe('string');
      expect(contentData.contentHash.length).toBe(64); // SHA-256 hex

      // Status was set to ready
      expect(updateStatusSpy).toHaveBeenCalledTimes(1);
      expect(updateStatusSpy.mock.calls[0]![0]).toBe('doc_test1');
      expect(updateStatusSpy.mock.calls[0]![1]).toBe('ready');
    });

    it('uploads content to correct storage path', async () => {
      const uploadSpy = vi.fn(
        (_key: string, _data: Buffer, _contentType: string) =>
          Effect.succeed(`mock://uploaded`),
      );
      const job = createTestJob({
        payload: {
          documentId: 'doc_abc',
          url: 'https://example.com/post',
          userId: 'user-1',
        },
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo(),
        createMockUrlScraper(),
        createMockStorage({ upload: uploadSpy }),
      );

      await Effect.runPromise(
        handleProcessUrl(job).pipe(Effect.provide(layers)),
      );

      expect(uploadSpy).toHaveBeenCalledTimes(1);
      const [key, _data, contentType] = uploadSpy.mock.calls[0]!;
      expect(key).toBe('documents/doc_abc/content.txt');
      expect(contentType).toBe('text/plain');
    });

    it('includes optional metadata from scraped content', async () => {
      const updateContentSpy = vi.fn();
      const job = createTestJob();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({ onUpdateContent: updateContentSpy }),
        createMockUrlScraper({
          fetchAndExtract: () =>
            Effect.succeed({
              title: 'Article With Metadata',
              content: 'Content here',
              description: 'A description',
              author: 'Jane Doe',
              publishedAt: '2024-06-01',
              wordCount: 2,
            }),
        }),
        createMockStorage(),
      );

      await Effect.runPromise(
        handleProcessUrl(job).pipe(Effect.provide(layers)),
      );

      const [_, contentData] = updateContentSpy.mock.calls[0]!;
      expect(contentData.title).toBe('Article With Metadata');
      expect(contentData.metadata).toEqual({
        description: 'A description',
        author: 'Jane Doe',
        publishedAt: '2024-06-01',
      });
    });

    it('omits undefined optional metadata fields', async () => {
      const updateContentSpy = vi.fn();
      const job = createTestJob();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({ onUpdateContent: updateContentSpy }),
        createMockUrlScraper({
          fetchAndExtract: () =>
            Effect.succeed({
              title: 'Minimal Article',
              content: 'Just content',
              wordCount: 2,
            }),
        }),
        createMockStorage(),
      );

      await Effect.runPromise(
        handleProcessUrl(job).pipe(Effect.provide(layers)),
      );

      const [_, contentData] = updateContentSpy.mock.calls[0]!;
      expect(contentData.metadata).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('handles empty content from scraper', async () => {
      const updateContentSpy = vi.fn();
      const job = createTestJob();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({ onUpdateContent: updateContentSpy }),
        createMockUrlScraper({
          fetchAndExtract: () =>
            Effect.succeed({
              title: 'Empty Page',
              content: '',
              wordCount: 0,
            }),
        }),
        createMockStorage(),
      );

      const result = await Effect.runPromise(
        handleProcessUrl(job).pipe(Effect.provide(layers)),
      );

      expect(result.wordCount).toBe(0);
      const [_, contentData] = updateContentSpy.mock.calls[0]!;
      expect(contentData.extractedText).toBe('');
      expect(contentData.wordCount).toBe(0);
    });

    it('produces deterministic content hash for same content', async () => {
      const updateContentSpy = vi.fn();
      const content = 'Deterministic hash test';

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({ onUpdateContent: updateContentSpy }),
        createMockUrlScraper({
          fetchAndExtract: () =>
            Effect.succeed({
              title: 'Hash Test',
              content,
              wordCount: 3,
            }),
        }),
        createMockStorage(),
      );

      // Run twice with same content
      const job1 = createTestJob();
      await Effect.runPromise(
        handleProcessUrl(job1).pipe(Effect.provide(layers)),
      );
      const hash1 = updateContentSpy.mock.calls[0]![1].contentHash;

      const job2 = createTestJob();
      await Effect.runPromise(
        handleProcessUrl(job2).pipe(Effect.provide(layers)),
      );
      const hash2 = updateContentSpy.mock.calls[1]![1].contentHash;

      expect(hash1).toBe(hash2);
    });
  });

  describe('error handling', () => {
    it('marks document as failed when scraping fails', async () => {
      const updateStatusSpy = vi.fn();
      const job = createTestJob();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({ onUpdateStatus: updateStatusSpy }),
        createMockUrlScraper({
          fetchAndExtract: () =>
            Effect.fail(
              new UrlFetchError({
                url: 'https://example.com/article',
                message: 'Connection refused',
              }),
            ),
        }),
        createMockStorage(),
      );

      const exit = await Effect.runPromiseExit(
        handleProcessUrl(job).pipe(Effect.provide(layers)),
      );

      // Handler should fail with JobProcessingError
      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure') {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        expect(error).toBeInstanceOf(JobProcessingError);
        expect((error as JobProcessingError).message).toContain(
          'Failed to process URL',
        );
      }

      // Document should be marked as failed
      expect(updateStatusSpy).toHaveBeenCalledWith(
        'doc_test1',
        'failed',
        expect.stringContaining('Connection refused'),
      );
    });

    it('marks document as failed when storage upload fails', async () => {
      const updateStatusSpy = vi.fn();
      const job = createTestJob();

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockDocumentRepo({ onUpdateStatus: updateStatusSpy }),
        createMockUrlScraper(),
        createMockStorage({
          upload: () =>
            Effect.fail(
              new StorageUploadError({
                key: 'test',
                message: 'Upload failed: disk full',
              }),
            ),
        }),
      );

      const exit = await Effect.runPromiseExit(
        handleProcessUrl(job).pipe(Effect.provide(layers)),
      );

      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure') {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        expect(error).toBeInstanceOf(JobProcessingError);
      }

      // Document should be marked as failed
      expect(updateStatusSpy).toHaveBeenCalledWith(
        'doc_test1',
        'failed',
        expect.any(String),
      );
    });

    it('still fails with JobProcessingError even if marking failed also errors', async () => {
      const job = createTestJob();

      // Use Effect.fail (not die) so the handler's catchAll can catch it
      const failingDocRepoLayer = Layer.succeed(DocumentRepo, {
        insert: () => Effect.die('not implemented'),
        findById: () => Effect.die('not implemented'),
        list: () => Effect.die('not implemented'),
        update: () => Effect.die('not implemented'),
        delete: () => Effect.die('not implemented'),
        count: () => Effect.die('not implemented'),
        updateStatus: () =>
          Effect.fail(new DbError({ message: 'DB connection lost' })),
        updateContent: () => Effect.die('not implemented'),
        findBySourceUrl: () => Effect.die('not implemented'),
        updateResearchConfig: () => Effect.die('not implemented'),
      } satisfies DocumentRepoService);

      const layers = Layer.mergeAll(
        MockDbLive,
        failingDocRepoLayer,
        createMockUrlScraper({
          fetchAndExtract: () =>
            Effect.fail(
              new UrlFetchError({
                url: 'https://example.com/article',
                message: 'Timeout',
              }),
            ),
        }),
        createMockStorage(),
      );

      const exit = await Effect.runPromiseExit(
        handleProcessUrl(job).pipe(Effect.provide(layers)),
      );

      // Should still fail gracefully even if updateStatus also fails
      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure') {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        expect(error).toBeInstanceOf(JobProcessingError);
      }
    });
  });
});
