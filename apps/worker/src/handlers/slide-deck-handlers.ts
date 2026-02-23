import { executeSlideDeckGeneration } from '@repo/media';
import { JobProcessingError, formatError } from '@repo/queue';
import { Effect } from 'effect';
import type { GenerateSlideDeckPayload, Job } from '@repo/queue';

export const handleGenerateSlideDeck = (
  job: Job<GenerateSlideDeckPayload>,
) =>
  executeSlideDeckGeneration({
    slideDeckId: job.payload.slideDeckId,
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(
        new JobProcessingError({
          jobId: job.id,
          message: `Failed to generate slide deck: ${formatError(error)}`,
          cause: error,
        }),
      ),
    ),
    Effect.withSpan('worker.handleGenerateSlideDeck', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'slideDeck.id': job.payload.slideDeckId,
      },
    }),
  );
