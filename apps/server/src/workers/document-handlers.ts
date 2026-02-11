import { DocumentStatus } from '@repo/db/schema';
import { DocumentRepo, UrlScraper } from '@repo/media';
import { JobProcessingError, formatError } from '@repo/queue';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import type { ProcessUrlPayload, ProcessUrlResult, Job } from '@repo/queue';

export const handleProcessUrl = (job: Job<ProcessUrlPayload>) =>
  Effect.gen(function* () {
    const { documentId, url } = job.payload;
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

    const encoder = new TextEncoder();
    const hashBuffer = yield* Effect.promise(() =>
      crypto.subtle.digest('SHA-256', encoder.encode(scraped.content)),
    );
    const contentHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

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

    return {
      documentId,
      wordCount: scraped.wordCount,
    } satisfies ProcessUrlResult;
  }).pipe(
    Effect.catchAll((error) => {
      const errorMessage = formatError(error);

      return DocumentRepo.pipe(
        Effect.flatMap((repo) =>
          repo
            .updateStatus(job.payload.documentId, DocumentStatus.FAILED, errorMessage)
            .pipe(Effect.catchAll(() => Effect.void)),
        ),
        Effect.flatMap(() =>
          Effect.fail(
            new JobProcessingError({
              jobId: job.id,
              message: `Failed to process URL: ${errorMessage}`,
              cause: error,
            }),
          ),
        ),
      );
    }),
    Effect.withSpan('worker.handleProcessUrl', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'document.id': job.payload.documentId,
        'document.url': job.payload.url,
      },
    }),
  );
