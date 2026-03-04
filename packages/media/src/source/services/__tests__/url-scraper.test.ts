import { extractFromHtml } from '@extractus/article-extractor';
import { Effect, Layer } from 'effect';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { UrlFetchError } from '../../../errors';
import { UrlScraper, type UrlScraperService } from '../url-scraper';
import { UrlScraperLive } from '../url-scraper-impl';

vi.mock('@extractus/article-extractor', () => ({
  extractFromHtml: vi.fn(),
}));

const extractFromHtmlMock = extractFromHtml as ReturnType<typeof vi.fn>;

const createMockUrlScraper = (
  overrides: Partial<UrlScraperService> = {},
): Layer.Layer<UrlScraper> =>
  Layer.succeed(UrlScraper, {
    fetchAndExtract:
      overrides.fetchAndExtract ?? (() => Effect.die('not implemented')),
  });

describe('UrlScraper', () => {
  describe('fetchAndExtract', () => {
    it('returns scraped content on success', async () => {
      const mockScraper = createMockUrlScraper({
        fetchAndExtract: () =>
          Effect.succeed({
            title: 'Test Article',
            content: 'This is the article content with multiple words.',
            description: 'A test article',
            author: 'Test Author',
            publishedAt: '2024-01-15',
            wordCount: 8,
          }),
      });

      const result = await Effect.runPromise(
        UrlScraper.pipe(
          Effect.flatMap((scraper) =>
            scraper.fetchAndExtract('https://example.com/article'),
          ),
          Effect.provide(mockScraper),
        ),
      );

      expect(result.title).toBe('Test Article');
      expect(result.content).toBe(
        'This is the article content with multiple words.',
      );
      expect(result.description).toBe('A test article');
      expect(result.author).toBe('Test Author');
      expect(result.wordCount).toBe(8);
    });

    it('returns content without optional fields', async () => {
      const mockScraper = createMockUrlScraper({
        fetchAndExtract: () =>
          Effect.succeed({
            title: 'Minimal Article',
            content: 'Just content.',
            wordCount: 2,
          }),
      });

      const result = await Effect.runPromise(
        UrlScraper.pipe(
          Effect.flatMap((scraper) =>
            scraper.fetchAndExtract('https://example.com/minimal'),
          ),
          Effect.provide(mockScraper),
        ),
      );

      expect(result.title).toBe('Minimal Article');
      expect(result.description).toBeUndefined();
      expect(result.author).toBeUndefined();
      expect(result.publishedAt).toBeUndefined();
    });

    it('fails with UrlFetchError for unreachable URLs', async () => {
      const mockScraper = createMockUrlScraper({
        fetchAndExtract: (url) =>
          Effect.fail(
            new UrlFetchError({
              url,
              message: 'Failed to fetch content',
            }),
          ),
      });

      const result = await Effect.runPromiseExit(
        UrlScraper.pipe(
          Effect.flatMap((scraper) =>
            scraper.fetchAndExtract('https://nonexistent.example.com'),
          ),
          Effect.provide(mockScraper),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('UrlFetchError');
        expect((error as UrlFetchError).url).toBe(
          'https://nonexistent.example.com',
        );
      }
    });

    it('fails with UrlFetchError when no content is extractable', async () => {
      const mockScraper = createMockUrlScraper({
        fetchAndExtract: (url) =>
          Effect.fail(
            new UrlFetchError({
              url,
              message: 'No content could be extracted from the URL',
            }),
          ),
      });

      const result = await Effect.runPromiseExit(
        UrlScraper.pipe(
          Effect.flatMap((scraper) =>
            scraper.fetchAndExtract('https://example.com/empty'),
          ),
          Effect.provide(mockScraper),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('UrlFetchError');
        expect((error as UrlFetchError).message).toContain('No content');
      }
    });
  });
});

describe('UrlScraperLive', () => {
  const originalFetch = globalThis.fetch;

  const mockHtmlResponse = (html: string, status = 200) =>
    new Response(html, {
      status,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn(async () =>
      mockHtmlResponse('<html><body>default</body></html>'),
    ) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('extracts content and counts words correctly', async () => {
    extractFromHtmlMock.mockResolvedValue({
      title: 'Real Article',
      content: '<p>Hello <strong>world</strong> this is a test article</p>',
      description: 'A description',
      author: 'Author Name',
      published: '2024-06-01',
    });

    const result = await Effect.runPromise(
      UrlScraper.pipe(
        Effect.flatMap((scraper) =>
          scraper.fetchAndExtract('https://example.com/real'),
        ),
        Effect.provide(UrlScraperLive),
      ),
    );

    expect(result.title).toBe('Real Article');
    expect(result.content).toBe('Hello world this is a test article');
    expect(result.wordCount).toBe(7);
    expect(result.description).toBe('A description');
    expect(result.author).toBe('Author Name');
    expect(result.publishedAt).toBe('2024-06-01');
  });

  it('falls back to hostname for title when none extracted', async () => {
    extractFromHtmlMock.mockResolvedValue({
      title: '',
      content: '<p>Some content here</p>',
    });

    const result = await Effect.runPromise(
      UrlScraper.pipe(
        Effect.flatMap((scraper) =>
          scraper.fetchAndExtract('https://blog.example.com/post'),
        ),
        Effect.provide(UrlScraperLive),
      ),
    );

    expect(result.title).toBe('blog.example.com');
  });

  it('returns UrlFetchError when extract returns null', async () => {
    extractFromHtmlMock.mockResolvedValue(null);

    const result = await Effect.runPromiseExit(
      UrlScraper.pipe(
        Effect.flatMap((scraper) =>
          scraper.fetchAndExtract('https://example.com/empty'),
        ),
        Effect.provide(UrlScraperLive),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('UrlFetchError');
      expect((error as UrlFetchError).message).toContain('No content');
    }
  });

  it('wraps extraction errors in UrlFetchError', async () => {
    extractFromHtmlMock.mockRejectedValue(new Error('Extraction failed'));

    const result = await Effect.runPromiseExit(
      UrlScraper.pipe(
        Effect.flatMap((scraper) =>
          scraper.fetchAndExtract('https://slow.example.com'),
        ),
        Effect.provide(UrlScraperLive),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('UrlFetchError');
      expect((error as UrlFetchError).message).toBe('Extraction failed');
      expect((error as UrlFetchError).url).toBe('https://slow.example.com');
    }
  });

  it('rejects redirects to private network targets', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: 'http://127.0.0.1/internal' },
        }),
    ) as typeof fetch;
    extractFromHtmlMock.mockResolvedValue({
      title: 'Should not matter',
      content: '<p>Never reached</p>',
    });

    const result = await Effect.runPromiseExit(
      UrlScraper.pipe(
        Effect.flatMap((scraper) =>
          scraper.fetchAndExtract('https://example.com/redirect'),
        ),
        Effect.provide(UrlScraperLive),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      const error = result.cause._tag === 'Fail' ? result.cause.error : null;
      expect(error?._tag).toBe('UrlFetchError');
      expect((error as UrlFetchError).message).toContain('private');
    }
  });
});
