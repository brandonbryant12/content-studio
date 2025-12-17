import { Podcasts, PodcastGenerator, type PodcastFull } from '@repo/media';
import { JobProcessingError } from '@repo/queue';
import { Effect } from 'effect';
import type {
  GeneratePodcastPayload,
  GeneratePodcastResult,
  GenerateScriptPayload,
  GenerateScriptResult,
  GenerateAudioPayload,
  GenerateAudioResult,
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
 * Handler for generate-podcast jobs.
 * Calls the PodcastGenerator service to generate script, synthesize audio, upload to storage, and update the record.
 *
 * Context requirements are inferred from the Effect - do NOT manually annotate the return type
 * as that can hide missing dependencies at runtime.
 *
 * Requires: PodcastGenerator (for generation), Podcasts (for setStatus on error)
 */
export const handleGeneratePodcast = (job: Job<GeneratePodcastPayload>) =>
  Effect.gen(function* () {
    const generator = yield* PodcastGenerator;
    const { podcastId, promptInstructions } = job.payload;

    // Generate podcast (Script + Audio - all handled by the generator service)
    const podcast: PodcastFull = yield* generator.generate(podcastId, {
      promptInstructions,
    });

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

/**
 * Handler for generate-script jobs (Phase 1).
 * Calls the PodcastGenerator service to generate script only.
 *
 * Requires: PodcastGenerator (for generation), Podcasts (for setStatus on error)
 */
export const handleGenerateScript = (job: Job<GenerateScriptPayload>) =>
  Effect.gen(function* () {
    const generator = yield* PodcastGenerator;
    const { podcastId, promptInstructions } = job.payload;

    // Generate script only
    const podcast: PodcastFull = yield* generator.generateScript(podcastId, {
      promptInstructions,
    });

    return {
      scriptId: podcast.script?.id ?? '',
      segmentCount: podcast.script?.segments.length ?? 0,
    } satisfies GenerateScriptResult;
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
        console.error('[Worker] Script generation failed:', errorMessage, error);

        return yield* Effect.fail(
          new JobProcessingError({
            jobId: job.id,
            message: `Failed to generate script: ${errorMessage}`,
            cause: error,
          }),
        );
      }),
    ),
    Effect.withSpan('worker.handleGenerateScript', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'podcast.id': job.payload.podcastId,
      },
    }),
  );

/**
 * Handler for generate-audio jobs (Phase 2).
 * Calls the PodcastGenerator service to generate audio from existing script.
 *
 * Requires: PodcastGenerator (for generation), Podcasts (for setStatus on error)
 */
export const handleGenerateAudio = (job: Job<GenerateAudioPayload>) =>
  Effect.gen(function* () {
    const generator = yield* PodcastGenerator;
    const { podcastId } = job.payload;

    // Generate audio from existing script
    const podcast: PodcastFull = yield* generator.generateAudio(podcastId);

    return {
      audioUrl: podcast.audioUrl ?? '',
      duration: podcast.duration ?? 0,
    } satisfies GenerateAudioResult;
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
        console.error('[Worker] Audio generation failed:', errorMessage, error);

        return yield* Effect.fail(
          new JobProcessingError({
            jobId: job.id,
            message: `Failed to generate audio: ${errorMessage}`,
            cause: error,
          }),
        );
      }),
    ),
    Effect.withSpan('worker.handleGenerateAudio', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'podcast.id': job.payload.podcastId,
      },
    }),
  );
