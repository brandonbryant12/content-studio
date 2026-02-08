import {
  generateScript,
  generateAudio,
  PodcastRepo,
  type GenerateScriptResult as UseCaseScriptResult,
  type GenerateAudioResult as UseCaseAudioResult,
} from '@repo/media';
import { ImageGen } from '@repo/ai';
import { Storage } from '@repo/storage';
import { JobProcessingError, formatError } from '@repo/queue';
import { Effect } from 'effect';
import type { Podcast } from '@repo/db/schema';
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
 * Options for handlers that support progress callbacks.
 */
export interface HandlerOptions {
  /** Called when script generation completes (before audio generation starts) */
  onScriptComplete?: (podcastId: string) => void;
}

/**
 * Generate a cover image for a podcast and store it.
 * Failures are silently caught — cover image is a nice-to-have.
 */
const generateCoverImage = (podcast: Podcast) =>
  Effect.gen(function* () {
    const imageGen = yield* ImageGen;
    const storage = yield* Storage;
    const podcastRepo = yield* PodcastRepo;

    const prompt =
      `Create a podcast cover image for "${podcast.title}". ${podcast.description ?? ''}. ${podcast.summary ?? ''}`.trim();

    const { imageData, mimeType } = yield* imageGen.generateImage({
      prompt,
      format: 'square',
    });

    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const storageKey = `podcasts/${podcast.id}/cover.${ext}`;
    yield* storage.upload(storageKey, imageData, mimeType);

    yield* podcastRepo.update(podcast.id, { coverImageStorageKey: storageKey });
  }).pipe(
    Effect.catchAll(() => Effect.void),
    Effect.withSpan('worker.generateCoverImage', {
      attributes: { 'podcast.id': podcast.id },
    }),
  );

/**
 * Handler for generate-podcast jobs.
 * Generates both script and audio in sequence (full podcast generation).
 *
 * Requires: All dependencies for generateScript and generateAudio
 */
export const handleGeneratePodcast = (
  job: Job<GeneratePodcastPayload>,
  options?: HandlerOptions,
) =>
  Effect.gen(function* () {
    const { podcastId, promptInstructions } = job.payload;

    // Phase 1: Generate script
    const scriptResult: UseCaseScriptResult = yield* generateScript({
      podcastId,
      promptInstructions,
    });

    // Notify that script is complete (so frontend can show script while audio generates)
    options?.onScriptComplete?.(scriptResult.podcast.id);

    // Generate cover image (non-blocking, failures silently caught)
    yield* generateCoverImage(scriptResult.podcast);

    // Phase 2: Generate audio from the new script
    const audioResult: UseCaseAudioResult = yield* generateAudio({
      podcastId: scriptResult.podcast.id,
    });

    return {
      podcastId: scriptResult.podcast.id,
      segmentCount: scriptResult.segmentCount,
      audioUrl: audioResult.audioUrl,
      duration: audioResult.duration,
    } satisfies GeneratePodcastResult;
  }).pipe(
    Effect.catchAll((error) => {
      const errorMessage = formatError(error);
      console.error('[Worker] Generation failed:', errorMessage, error);

      return Effect.fail(
        new JobProcessingError({
          jobId: job.id,
          message: `Failed to generate podcast: ${errorMessage}`,
          cause: error,
        }),
      );
    }),
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
 * Generates script only - stops at script_ready status.
 *
 * Requires: All dependencies for generateScript
 */
export const handleGenerateScript = (job: Job<GenerateScriptPayload>) =>
  Effect.gen(function* () {
    const { podcastId, promptInstructions } = job.payload;

    // Generate script only
    const result: UseCaseScriptResult = yield* generateScript({
      podcastId,
      promptInstructions,
    });

    // Generate cover image (non-blocking, failures silently caught)
    yield* generateCoverImage(result.podcast);

    return {
      podcastId: result.podcast.id,
      segmentCount: result.segmentCount,
    } satisfies GenerateScriptResult;
  }).pipe(
    Effect.catchAll((error) => {
      const errorMessage = formatError(error);
      console.error('[Worker] Script generation failed:', errorMessage, error);

      return Effect.fail(
        new JobProcessingError({
          jobId: job.id,
          message: `Failed to generate script: ${errorMessage}`,
          cause: error,
        }),
      );
    }),
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
 * Generates audio from existing script.
 *
 * Requires: All dependencies for generateAudio
 */
export const handleGenerateAudio = (job: Job<GenerateAudioPayload>) =>
  Effect.gen(function* () {
    const { podcastId } = job.payload;

    // Generate audio from existing script
    const result: UseCaseAudioResult = yield* generateAudio({
      podcastId,
    });

    return {
      audioUrl: result.audioUrl,
      duration: result.duration,
    } satisfies GenerateAudioResult;
  }).pipe(
    Effect.catchAll((error) => {
      const errorMessage = formatError(error);
      console.error('[Worker] Audio generation failed:', errorMessage, error);

      return Effect.fail(
        new JobProcessingError({
          jobId: job.id,
          message: `Failed to generate audio: ${errorMessage}`,
          cause: error,
        }),
      );
    }),
    Effect.withSpan('worker.handleGenerateAudio', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'podcast.id': job.payload.podcastId,
      },
    }),
  );
