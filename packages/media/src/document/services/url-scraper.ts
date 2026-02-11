import { Context, Effect } from 'effect';
import type { UrlFetchError } from '../../errors';

export interface ScrapedContent {
  readonly title: string;
  readonly content: string;
  readonly description?: string;
  readonly author?: string;
  readonly publishedAt?: string;
  readonly wordCount: number;
}

export interface UrlScraperService {
  readonly fetchAndExtract: (
    url: string,
  ) => Effect.Effect<ScrapedContent, UrlFetchError>;
}

export class UrlScraper extends Context.Tag('@repo/media/UrlScraper')<
  UrlScraper,
  UrlScraperService
>() {}
