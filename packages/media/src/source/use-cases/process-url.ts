import { SourceStatus } from '@repo/db/schema';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import {
  annotateUseCaseSpan,
  formatUnknownError,
  withUseCaseSpan,
} from '../../shared';
import { SourceRepo } from '../repos';
import { calculateContentHash } from '../services/content-utils';
import { UrlScraper } from '../services/url-scraper';
import { validateUrl } from '../services/url-validator';

export interface ProcessUrlInput {
  sourceId: string;
  url: string;
}

export const processUrl = (input: ProcessUrlInput) =>
  Effect.gen(function* () {
    const { sourceId } = input;
    const sourceRepo = yield* SourceRepo;
    const urlScraper = yield* UrlScraper;
    const storage = yield* Storage;

    const doc = yield* sourceRepo.findById(sourceId);
    const urlToProcess = doc.sourceUrl ?? input.url;
    const validatedUrl = yield* validateUrl(urlToProcess);

    yield* annotateUseCaseSpan({
      userId: doc.createdBy,
      resourceId: sourceId,
      attributes: {
        'source.id': sourceId,
        'source.url': validatedUrl.href,
      },
    });
    const scraped = yield* urlScraper.fetchAndExtract(validatedUrl.href);
    const metadata = {
      ...(scraped.description ? { description: scraped.description } : {}),
      ...(scraped.author ? { author: scraped.author } : {}),
      ...(scraped.publishedAt ? { publishedAt: scraped.publishedAt } : {}),
    };

    const contentKey = `sources/${sourceId}/content.txt`;
    yield* storage.upload(
      contentKey,
      Buffer.from(scraped.content, 'utf-8'),
      'text/plain',
    );

    const contentHash = yield* calculateContentHash(scraped.content);

    yield* sourceRepo.updateContent(sourceId, {
      contentKey,
      extractedText: scraped.content,
      contentHash,
      wordCount: scraped.wordCount,
      title: scraped.title,
      metadata,
    });

    yield* sourceRepo.updateStatus(sourceId, SourceStatus.READY);

    return { sourceId, wordCount: scraped.wordCount };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const repo = yield* SourceRepo;
        yield* repo
          .updateStatus(
            input.sourceId,
            SourceStatus.FAILED,
            formatUnknownError(error),
          )
          .pipe(Effect.ignore);
        return yield* Effect.fail(error);
      }),
    ),
    withUseCaseSpan('useCase.processUrl'),
  );
