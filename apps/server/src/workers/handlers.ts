import {
  generateScript,
  generateAudio,
  ScriptVersionRepo,
  type GenerateScriptResult as UseCaseScriptResult,
  type GenerateAudioResult as UseCaseAudioResult,
} from '@repo/media';
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
 * Generates both script and audio in sequence (full podcast generation).
 *
 * Requires: All dependencies for generateScript and generateAudio
 */
export const handleGeneratePodcast = (job: Job<GeneratePodcastPayload>) =>
  Effect.gen(function* () {
    const { podcastId, promptInstructions } = job.payload;

    // Phase 1: Generate script
    const scriptResult: UseCaseScriptResult = yield* generateScript({
      podcastId,
      promptInstructions,
    });

    // Phase 2: Generate audio from the new script
    const audioResult: UseCaseAudioResult = yield* generateAudio({
      versionId: scriptResult.version.id,
    });

    return {
      scriptId: scriptResult.version.id,
      segmentCount: scriptResult.segmentCount,
      audioUrl: audioResult.audioUrl,
      duration: audioResult.duration,
    } satisfies GeneratePodcastResult;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const scriptVersionRepo = yield* ScriptVersionRepo;
        const { podcastId } = job.payload;

        // Try to find and mark the active version as failed
        const activeVersion =
          yield* scriptVersionRepo.findActiveByPodcastId(podcastId);
        if (activeVersion) {
          yield* scriptVersionRepo
            .updateStatus(activeVersion.id, 'failed', formatError(error))
            .pipe(
              Effect.catchAll((statusError) =>
                Effect.sync(() => {
                  console.error('[Worker] Failed to update version status:', {
                    podcastId,
                    originalError: formatError(error),
                    statusError: formatError(statusError),
                  });
                }),
              ),
            );
        }

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

    return {
      scriptId: result.version.id,
      segmentCount: result.segmentCount,
    } satisfies GenerateScriptResult;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const scriptVersionRepo = yield* ScriptVersionRepo;
        const { podcastId } = job.payload;

        // Try to find and mark the active version as failed
        const activeVersion =
          yield* scriptVersionRepo.findActiveByPodcastId(podcastId);
        if (activeVersion) {
          yield* scriptVersionRepo
            .updateStatus(activeVersion.id, 'failed', formatError(error))
            .pipe(
              Effect.catchAll((statusError) =>
                Effect.sync(() => {
                  console.error('[Worker] Failed to update version status:', {
                    podcastId,
                    originalError: formatError(error),
                    statusError: formatError(statusError),
                  });
                }),
              ),
            );
        }

        const errorMessage = formatError(error);
        console.error(
          '[Worker] Script generation failed:',
          errorMessage,
          error,
        );

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
 * Generates audio from existing script.
 *
 * Requires: All dependencies for generateAudio
 */
export const handleGenerateAudio = (job: Job<GenerateAudioPayload>) =>
  Effect.gen(function* () {
    const { versionId } = job.payload;

    // Generate audio from existing script
    const result: UseCaseAudioResult = yield* generateAudio({
      versionId,
    });

    return {
      audioUrl: result.audioUrl,
      duration: result.duration,
    } satisfies GenerateAudioResult;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const scriptVersionRepo = yield* ScriptVersionRepo;
        const { versionId } = job.payload;

        // Mark version as failed
        yield* scriptVersionRepo
          .updateStatus(versionId, 'failed', formatError(error))
          .pipe(
            Effect.catchAll((statusError) =>
              Effect.sync(() => {
                console.error('[Worker] Failed to update version status:', {
                  versionId,
                  originalError: formatError(error),
                  statusError: formatError(statusError),
                });
              }),
            ),
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
        'version.id': job.payload.versionId,
      },
    }),
  );
