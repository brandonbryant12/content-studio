import { processResearch } from '@repo/media';
import { JobProcessingError, formatError } from '@repo/queue';
import { Effect } from 'effect';
import type { ProcessResearchPayload, Job } from '@repo/queue';

export const handleProcessResearch = (job: Job<ProcessResearchPayload>) =>
  processResearch({
    sourceId: job.payload.sourceId,
    query: job.payload.query,
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(
        new JobProcessingError({
          jobId: job.id,
          message: `Failed to process research: ${formatError(error)}`,
          cause: error,
        }),
      ),
    ),
    Effect.withSpan('worker.handleProcessResearch', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'source.id': job.payload.sourceId,
      },
    }),
  );
