import { executeInfographicGeneration } from '@repo/media';
import { JobProcessingError, formatError } from '@repo/queue';
import { Effect } from 'effect';
import type { GenerateInfographicPayload, Job } from '@repo/queue';

export const handleGenerateInfographic = (
  job: Job<GenerateInfographicPayload>,
) =>
  executeInfographicGeneration({
    infographicId: job.payload.infographicId,
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(
        new JobProcessingError({
          jobId: job.id,
          message: `Failed to generate infographic: ${formatError(error)}`,
          cause: error,
        }),
      ),
    ),
    Effect.withSpan('worker.handleGenerateInfographic', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'infographic.id': job.payload.infographicId,
      },
    }),
  );
