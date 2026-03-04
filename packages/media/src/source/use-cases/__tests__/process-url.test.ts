import { SourceStatus, generateSourceId, type Source } from '@repo/db/schema';
import { createMockStorage } from '@repo/storage/testing';
import { createTestSource } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UrlFetchError } from '../../../errors';
import {
  createMockSourceRepo,
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
        ? Effect.fail(
            new UrlFetchError({
              url: 'https://example.com',
              message: 'scrape failed',
            }),
          )
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

  it('updates source content and marks it ready', async () => {
    const sourceId = generateSourceId();
    const updateContentSpy = vi.fn();
    const updateStatusSpy = vi.fn();
    const testSource = createTestSource({ id: sourceId });

    const repo = createMockSourceRepo({
      findById: () => Effect.succeed(testSource),
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
          } as Source;
        }),
      updateStatus: (id, status) =>
        Effect.sync(() => {
          updateStatusSpy(id, status);
          return {
            id,
            status,
          } as Source;
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

    const result = await Effect.runPromise(
      processUrl({ sourceId, url: 'https://example.com' }).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result.sourceId).toBe(sourceId);
    expect(result.wordCount).toBe(2);
    expect(updateContentSpy).toHaveBeenCalledTimes(1);
    expect(updateStatusSpy).toHaveBeenCalledWith(sourceId, SourceStatus.READY);

    const [, updatePayload] = updateContentSpy.mock.calls[0]!;
    expect(updatePayload.contentKey).toBe(`sources/${sourceId}/content.txt`);
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

  it('marks source as failed when scraping fails', async () => {
    const sourceId = generateSourceId();
    const updateStatusSpy = vi.fn();
    const testSource = createTestSource({ id: sourceId });

    const repo = createMockSourceRepo({
      findById: () => Effect.succeed(testSource),
      updateStatus: (id, status, errorMessage) =>
        Effect.sync(() => {
          updateStatusSpy(id, status, errorMessage);
          return {
            id,
            status,
          } as Source;
        }),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      repo,
      createMockUrlScraper({ shouldFail: true }),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
    );

    const result = await Effect.runPromiseExit(
      processUrl({ sourceId, url: 'https://example.com' }).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result._tag).toBe('Failure');
    expect(updateStatusSpy).toHaveBeenCalledTimes(1);
    const [, status, errorMessage] = updateStatusSpy.mock.calls[0]!;
    expect(status).toBe(SourceStatus.FAILED);
    expect(String(errorMessage)).toContain('scrape failed');
  });

  it('prefers persisted sourceUrl over job payload URL', async () => {
    const sourceId = generateSourceId();
    const fetchSpy = vi.fn((_url: string) =>
      Effect.succeed({
        title: 'Stored URL Article',
        content: 'Hello world',
        wordCount: 2,
      }),
    );
    const testSource = createTestSource({
      id: sourceId,
      source: 'url',
      sourceUrl: 'https://stored.example.com/page',
    });

    const repo = createMockSourceRepo({
      findById: () => Effect.succeed(testSource),
      updateContent: (id, data) =>
        Effect.succeed({
          id,
          contentKey: data.contentKey,
          extractedText: data.extractedText,
          contentHash: data.contentHash,
          wordCount: data.wordCount,
          title: data.title,
          metadata: data.metadata ?? null,
        } as Source),
      updateStatus: (id, status) => Effect.succeed({ id, status } as Source),
    });

    const scraperLayer = Layer.succeed(UrlScraper, {
      fetchAndExtract: fetchSpy,
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      repo,
      scraperLayer,
      createMockStorage({ baseUrl: 'https://storage.example/' }),
    );

    await Effect.runPromise(
      processUrl({
        sourceId,
        url: 'https://payload.example.com/should-not-be-used',
      }).pipe(Effect.provide(layers)),
    );

    expect(fetchSpy).toHaveBeenCalledWith('https://stored.example.com/page');
  });
});
