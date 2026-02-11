import { Effect, Layer } from 'effect';
import { describe, it, expect, vi } from 'vitest';
import { UrlScraper, type UrlScraperService } from '../url-scraper';
import { UrlFetchError } from '../../../errors';


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
        expect(error).toBeInstanceOf(UrlFetchError);
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
        expect(error).toBeInstanceOf(UrlFetchError);
        expect((error as UrlFetchError).message).toContain('No content');
      }
    });
  });
});


describe('UrlScraperLive', () => {
  // We test the implementation by mocking the external `extract` function
  vi.mock('@extractus/article-extractor', () => ({
    extract: vi.fn(),
  }));

  // Must import after mock setup
  const getExtractMock = async () => {
    const mod = await import('@extractus/article-extractor');
    return mod.extract as ReturnType<typeof vi.fn>;
  };

  const getUrlScraperLive = async () => {
    const mod = await import('../url-scraper-impl');
    return mod.UrlScraperLive;
  };

  it('extracts content and counts words correctly', async () => {
    const extractMock = await getExtractMock();
    extractMock.mockResolvedValue({
      title: 'Real Article',
      content: '<p>Hello <strong>world</strong> this is a test article</p>',
      description: 'A description',
      author: 'Author Name',
      published: '2024-06-01',
    });

    const UrlScraperLive = await getUrlScraperLive();

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
    const extractMock = await getExtractMock();
    extractMock.mockResolvedValue({
      title: '',
      content: '<p>Some content here</p>',
    });

    const UrlScraperLive = await getUrlScraperLive();

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
    const extractMock = await getExtractMock();
    extractMock.mockResolvedValue(null);

    const UrlScraperLive = await getUrlScraperLive();

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
      expect(error).toBeInstanceOf(UrlFetchError);
      expect((error as UrlFetchError).message).toContain('No content');
    }
  });

  it('wraps fetch errors in UrlFetchError', async () => {
    const extractMock = await getExtractMock();
    extractMock.mockRejectedValue(new Error('Network timeout'));

    const UrlScraperLive = await getUrlScraperLive();

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
      expect(error).toBeInstanceOf(UrlFetchError);
      expect((error as UrlFetchError).message).toBe('Network timeout');
      expect((error as UrlFetchError).url).toBe('https://slow.example.com');
    }
  });
});
