import { generateInfographic } from '@repo/media';
import { JobProcessingError } from '@repo/queue';
import { Effect } from 'effect';
import type {
  GenerateInfographicPayload,
  GenerateInfographicResult,
  Job,
} from '@repo/queue';

/**
 * Format an error for logging - handles Effect tagged errors and standard errors.
 */
const formatError = (error: unknown): string => {
  if (error && typeof error === 'object') {
    // Effect tagged error
    if ('_tag' in error) {
      const tag = (error as { _tag: string })._tag;
      const message =
        'message' in error ? (error as { message: string }).message : '';
      return message ? `${tag}: ${message}` : tag;
    }
    // Standard Error
    if (error instanceof Error) {
      return error.message || error.name;
    }
  }
  return String(error);
};

/**
 * Handler for generate-infographic jobs.
 * Generates an infographic image from selected text content.
 *
 * Requires: InfographicRepo, SelectionRepo, DocumentRepo, Image, Storage
 */
export const handleGenerateInfographic = (
  job: Job<GenerateInfographicPayload>,
) =>
  Effect.gen(function* () {
    const { infographicId } = job.payload;

    // Generate infographic image
    const result = yield* generateInfographic({ infographicId });

    return {
      infographicId: result.infographicId,
      imageUrl: result.imageUrl,
    } satisfies GenerateInfographicResult;
  }).pipe(
    Effect.catchAll((error) => {
      const errorMessage = formatError(error);
      console.error(
        '[InfographicWorker] Image generation failed:',
        errorMessage,
        error,
      );

      return Effect.fail(
        new JobProcessingError({
          jobId: job.id,
          message: `Failed to generate infographic: ${errorMessage}`,
          cause: error,
        }),
      );
    }),
    Effect.withSpan('worker.handleGenerateInfographic', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'infographic.id': job.payload.infographicId,
      },
    }),
  );
