import { processUrl } from '@repo/media';
import { JobProcessingError, formatError } from '@repo/queue';
import { Effect } from 'effect';
import type { ProcessUrlPayload, ProcessUrlResult, Job } from '@repo/queue';

export const handleProcessUrl = (job: Job<ProcessUrlPayload>) =>
  processUrl({
    documentId: job.payload.documentId,
    url: job.payload.url,
  }).pipe(
    Effect.map((result) => result satisfies ProcessUrlResult),
    Effect.catchAll((error) =>
      Effect.fail(
        new JobProcessingError({
          jobId: job.id,
          message: `Failed to process URL: ${formatError(error)}`,
          cause: error,
        }),
      ),
    ),
    Effect.withSpan('worker.handleProcessUrl', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'document.id': job.payload.documentId,
        'document.url': job.payload.url,
      },
    }),
  );
