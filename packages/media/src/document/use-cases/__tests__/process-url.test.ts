import { DocumentStatus, type Document } from '@repo/db/schema';
import { createMockStorage } from '@repo/storage/testing';
import { createTestUser, withTestUser } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UrlFetchError } from '../../../errors';
import {
  createMockDocumentRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { UrlScraper } from '../../services/url-scraper';
import { processUrl } from '../process-url';

const createMockUrlScraper = (options: {
  fetchResult?: {
    title: string;
    content: string;
    description?: string;
    author?: string;
    publishedAt?: string;
    wordCount: number;
  };
  shouldFail?: boolean;
}): Layer.Layer<UrlScraper> => {
  const service = {
    fetchAndExtract: () =>
      options.shouldFail
        ? Effect.fail(new UrlFetchError({ url: 'https://example.com', message: 'scrape failed' }))
        : Effect.succeed(
            options.fetchResult ?? {
              title: 'Example Title',
              content: 'Example content',
              description: 'Example description',
              author: 'Example Author',
              publishedAt: '2025-01-01',
              wordCount: 123,
            },
          ),
  };

  return Layer.succeed(UrlScraper, service);
};

describe('processUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('updates document content and marks it ready', async () => {
    const documentId = 'doc_123';
    const updateContentSpy = vi.fn();
    const updateStatusSpy = vi.fn();

    const repo = createMockDocumentRepo({
      updateContent: (id, data) =>
        Effect.sync(() => {
          updateContentSpy(id, data);
          return {
            id,
            contentKey: data.contentKey,
            extractedText: data.extractedText,
            contentHash: data.contentHash,
            wordCount: data.wordCount,
            title: data.title,
            metadata: data.metadata ?? null,
          } as Document;
        }),
      updateStatus: (id, status) =>
        Effect.sync(() => {
          updateStatusSpy(id, status);
          return {
            id,
            status,
          } as Document;
        }),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      repo,
      createMockUrlScraper({
        fetchResult: {
          title: 'Sample Article',
          content: 'Hello world',
          description: 'Short description',
          author: 'Author Name',
          publishedAt: '2024-06-01',
          wordCount: 2,
        },
      }),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
    );
    const user = createTestUser({ id: 'user_123' });

    const result = await Effect.runPromise(
      withTestUser(user)(
        processUrl({ documentId, url: 'https://example.com' }).pipe(
          Effect.provide(layers),
        ),
      ),
    );

    expect(result.documentId).toBe(documentId);
    expect(result.wordCount).toBe(2);
    expect(updateContentSpy).toHaveBeenCalledTimes(1);
    expect(updateStatusSpy).toHaveBeenCalledWith(
      documentId,
      DocumentStatus.READY,
    );

    const [, updatePayload] = updateContentSpy.mock.calls[0]!;
    expect(updatePayload.contentKey).toBe(`documents/${documentId}/content.txt`);
    expect(updatePayload.extractedText).toBe('Hello world');
    expect(updatePayload.wordCount).toBe(2);
    expect(updatePayload.title).toBe('Sample Article');
    expect(updatePayload.metadata).toEqual({
      description: 'Short description',
      author: 'Author Name',
      publishedAt: '2024-06-01',
    });
    expect(updatePayload.contentHash).toEqual(expect.any(String));
  });

  it('marks document as failed when scraping fails', async () => {
    const documentId = 'doc_456';
    const updateStatusSpy = vi.fn();

    const repo = createMockDocumentRepo({
      updateStatus: (id, status, errorMessage) =>
        Effect.sync(() => {
          updateStatusSpy(id, status, errorMessage);
          return {
            id,
            status,
          } as Document;
        }),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      repo,
      createMockUrlScraper({ shouldFail: true }),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
    );
    const user = createTestUser({ id: 'user_456' });

    const result = await Effect.runPromiseExit(
      withTestUser(user)(
        processUrl({ documentId, url: 'https://example.com' }).pipe(
          Effect.provide(layers),
        ),
      ),
    );

    expect(result._tag).toBe('Failure');
    expect(updateStatusSpy).toHaveBeenCalledTimes(1);
    const [, status, errorMessage] = updateStatusSpy.mock.calls[0]!;
    expect(status).toBe(DocumentStatus.FAILED);
    expect(String(errorMessage)).toContain('scrape failed');
  });
});
