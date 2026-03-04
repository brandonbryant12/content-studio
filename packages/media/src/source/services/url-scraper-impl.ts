import { Effect, Layer } from 'effect';
import type { extractFromHtml as articleExtractorExtractFromHtml } from '@extractus/article-extractor';
import { UrlFetchError } from '../../errors';
import { calculateWordCount } from '../../shared';
import {
  UrlScraper,
  type ScrapedContent,
  type UrlScraperService,
} from './url-scraper';
import { validateUrl } from './url-validator';

const FETCH_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_REDIRECTS = 5;
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

type ExtractFromHtmlFn = typeof articleExtractorExtractFromHtml;

let extractFromHtmlPromise: Promise<ExtractFromHtmlFn> | null = null;

const getExtractorFromHtml = async (): Promise<ExtractFromHtmlFn> => {
  if (!extractFromHtmlPromise) {
    // eslint-disable-next-line no-restricted-syntax -- lazy-load avoids eager cross-fetch startup in unrelated test/runtime paths
    extractFromHtmlPromise = import('@extractus/article-extractor').then(
      (module) => module.extractFromHtml,
    );
  }
  return extractFromHtmlPromise;
};

const createRequestHeaders = (): Record<string, string> => ({
  'User-Agent': 'Mozilla/5.0 (compatible; ContentStudioBot/1.0)',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
});

const parseCharset = (contentType: string | null): string => {
  if (!contentType) return 'utf-8';
  const match = /charset=([^;]+)/i.exec(contentType);
  const charset = match?.[1]?.trim();
  return charset && charset.length > 0 ? charset : 'utf-8';
};

const decodeResponse = async (response: Response): Promise<string> => {
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > MAX_RESPONSE_SIZE) {
      throw new Error(
        `Response exceeds maximum size of ${MAX_RESPONSE_SIZE} bytes`,
      );
    }
  }

  const body = response.body;
  if (!body) {
    return '';
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;

    bytesRead += value.byteLength;
    if (bytesRead > MAX_RESPONSE_SIZE) {
      throw new Error(
        `Response exceeds maximum size of ${MAX_RESPONSE_SIZE} bytes`,
      );
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const charset = parseCharset(response.headers.get('content-type'));
  const decoder = (() => {
    try {
      return new TextDecoder(charset);
    } catch {
      return new TextDecoder('utf-8');
    }
  })();

  return decoder.decode(merged);
};

const fetchHtmlWithRedirectValidation = async (
  url: string,
  signal: AbortSignal,
): Promise<{ html: string; finalUrl: string }> => {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const response = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: createRequestHeaders(),
      signal,
    });

    if (REDIRECT_STATUS_CODES.has(response.status)) {
      if (redirectCount === MAX_REDIRECTS) {
        throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
      }

      const location = response.headers.get('location');
      if (!location) {
        throw new Error(
          `Redirect response (${response.status}) did not provide a Location header`,
        );
      }

      const resolvedRedirect = new URL(location, currentUrl).toString();
      const validatedRedirect = await Effect.runPromise(
        validateUrl(resolvedRedirect),
      );
      currentUrl = validatedRedirect.href;
      continue;
    }

    if (!response.ok) {
      throw new Error(`Request failed with error code ${response.status}`);
    }

    const html = await decodeResponse(response);
    return { html, finalUrl: currentUrl };
  }

  throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
};

const make: UrlScraperService = {
  fetchAndExtract: (
    url: string,
  ): Effect.Effect<ScrapedContent, UrlFetchError> =>
    Effect.tryPromise({
      try: async (signal) => {
        const fetchSignal = AbortSignal.any([
          signal,
          AbortSignal.timeout(FETCH_TIMEOUT_MS),
        ]);

        const { html, finalUrl } = await fetchHtmlWithRedirectValidation(
          url,
          fetchSignal,
        );
        const extractFromHtml = await getExtractorFromHtml();
        const article = await extractFromHtml(html, finalUrl, {});

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
          title: article.title || new URL(finalUrl).hostname,
          content: plainText,
          description: article.description ?? undefined,
          author: article.author ?? undefined,
          publishedAt: article.published ?? undefined,
          wordCount: calculateWordCount(plainText),
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
