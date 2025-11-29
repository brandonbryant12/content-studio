import { Podcasts, PodcastGenerator, type PodcastFull } from '@repo/podcast';
import { JobProcessingError } from '@repo/queue';
import { Effect, Cause } from 'effect';
import type { GeneratePodcastPayload, GeneratePodcastResult, Job } from '@repo/queue';

/**
 * Format an error for logging - handles Effect tagged errors and standard errors.
 */
const formatError = (error: unknown): string => {
  if (error && typeof error === 'object') {
    // Effect tagged error
    if ('_tag' in error) {
      const tag = (error as { _tag: string })._tag;
      const message = 'message' in error ? (error as { message: string }).message : '';
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
 * Handler for generate-podcast jobs.
 * Calls the PodcastGenerator service to generate script, synthesize audio, upload to storage, and update the record.
 *
 * Context requirements are inferred from the Effect - do NOT manually annotate the return type
 * as that can hide missing dependencies at runtime.
 *
 * Requires: PodcastGenerator (for generation), Podcasts (for setStatus on error)
 */
export const handleGeneratePodcast = (
  job: Job<GeneratePodcastPayload>,
) =>
  Effect.gen(function* () {
    const generator = yield* PodcastGenerator;
    const { podcastId, promptInstructions } = job.payload;

    // Generate podcast (Script + Audio - all handled by the generator service)
    const podcast: PodcastFull = yield* generator.generate(podcastId, { promptInstructions });

    return {
      scriptId: podcast.script?.id ?? '',
      segmentCount: podcast.script?.segments.length ?? 0,
      audioUrl: podcast.audioUrl ?? '',
      duration: podcast.duration ?? 0,
    } satisfies GeneratePodcastResult;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const podcasts = yield* Podcasts;
        const { podcastId } = job.payload;

        // Try to mark podcast as failed
        yield* podcasts.setStatus(podcastId, 'failed', String(error)).pipe(
          Effect.catchAll(() => Effect.void), // Ignore errors updating status
        );

        const errorMessage = formatError(error);
        console.error('[Worker] Generation failed:', errorMessage, error);

        return yield* Effect.fail(
          new JobProcessingError({
            jobId: job.id,
            message: `Failed to generate podcast: ${errorMessage}`,
            cause: error,
          }),
        );
      }),
    ),
    Effect.withSpan('worker.handleGeneratePodcast', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'podcast.id': job.payload.podcastId,
      },
    }),
  );
