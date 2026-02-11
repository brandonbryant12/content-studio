import { extract } from '@extractus/article-extractor';
import { Effect, Layer } from 'effect';
import { UrlFetchError } from '../../errors';
import {
  UrlScraper,
  type ScrapedContent,
  type UrlScraperService,
} from './url-scraper';

const FETCH_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

const make: UrlScraperService = {
  fetchAndExtract: (
    url: string,
  ): Effect.Effect<ScrapedContent, UrlFetchError> =>
    Effect.tryPromise({
      try: async (signal) => {
        const fetchOptions = {
          signal: AbortSignal.any([
            signal,
            AbortSignal.timeout(FETCH_TIMEOUT_MS),
          ]),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ContentStudioBot/1.0)',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          size: MAX_RESPONSE_SIZE,
        };

        const article = await extract(url, {}, fetchOptions);

        if (!article || !article.content) {
          throw new Error('No content could be extracted from the URL');
        }

        // Strip HTML tags and decode entities to get plain text
        const plainText = article.content
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();

        return {
          title: article.title || new URL(url).hostname,
          content: plainText,
          description: article.description ?? undefined,
          author: article.author ?? undefined,
          publishedAt: article.published ?? undefined,
          wordCount: countWords(plainText),
        } satisfies ScrapedContent;
      },
      catch: (error) =>
        new UrlFetchError({
          url,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to fetch and extract content from URL',
          cause: error,
        }),
    }).pipe(
      Effect.withSpan('urlScraper.fetchAndExtract', {
        attributes: { url },
      }),
    ),
};

export const UrlScraperLive: Layer.Layer<UrlScraper> = Layer.succeed(
  UrlScraper,
  make,
);
