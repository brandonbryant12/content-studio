import { processUrl } from '@repo/media';
import { JobProcessingError, formatError } from '@repo/queue';
import { Effect } from 'effect';
import type { ProcessUrlPayload, Job } from '@repo/queue';

export const handleProcessUrl = (job: Job<ProcessUrlPayload>) =>
  processUrl({
    sourceId: job.payload.sourceId,
    url: job.payload.url,
  }).pipe(
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
        'source.id': job.payload.sourceId,
        'source.url': job.payload.url,
      },
    }),
  );
