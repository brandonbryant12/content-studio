import { DocumentStatus } from '@repo/db/schema';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { DocumentRepo } from '../repos';
import { calculateContentHash } from '../services/content-utils';
import { UrlScraper } from '../services/url-scraper';

export interface ProcessUrlInput {
  documentId: string;
  url: string;
}

export const processUrl = (input: ProcessUrlInput) =>
  Effect.gen(function* () {
    const { documentId, url } = input;
    const documentRepo = yield* DocumentRepo;
    const urlScraper = yield* UrlScraper;
    const storage = yield* Storage;

    const scraped = yield* urlScraper.fetchAndExtract(url);

    const contentKey = `documents/${documentId}/content.txt`;
    yield* storage.upload(
      contentKey,
      Buffer.from(scraped.content, 'utf-8'),
      'text/plain',
    );

    const contentHash = yield* calculateContentHash(scraped.content);

    yield* documentRepo.updateContent(documentId, {
      contentKey,
      extractedText: scraped.content,
      contentHash,
      wordCount: scraped.wordCount,
      title: scraped.title,
      metadata: {
        ...(scraped.description && { description: scraped.description }),
        ...(scraped.author && { author: scraped.author }),
        ...(scraped.publishedAt && { publishedAt: scraped.publishedAt }),
      },
    });

    yield* documentRepo.updateStatus(documentId, DocumentStatus.READY);

    return { documentId, wordCount: scraped.wordCount };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const repo = yield* DocumentRepo;
        yield* repo
          .updateStatus(input.documentId, DocumentStatus.FAILED, String(error))
          .pipe(Effect.ignore);
        return yield* Effect.fail(error);
      }),
    ),
    Effect.withSpan('useCase.processUrl', {
      attributes: {
        'document.id': input.documentId,
        'document.url': input.url,
      },
    }),
  );
