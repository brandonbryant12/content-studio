import {
  generateScript,
  generateAudio,
  generateCoverImage,
  syncEntityTitle,
  type GenerateScriptResult as UseCaseScriptResult,
  type GenerateAudioResult as UseCaseAudioResult,
} from '@repo/media';
import { JobProcessingError, formatError } from '@repo/queue';
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

export const handleGeneratePodcast = (job: Job<GeneratePodcastPayload>) =>
  Effect.gen(function* () {
    const { podcastId, promptInstructions } = job.payload;

    const scriptResult: UseCaseScriptResult = yield* generateScript({
      podcastId,
      promptInstructions,
    });

    yield* syncEntityTitle(scriptResult.podcast.id, scriptResult.podcast.title);
    yield* generateCoverImage({ podcastId: scriptResult.podcast.id });

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
    Effect.catchAll((error) =>
      Effect.fail(
        new JobProcessingError({
          jobId: job.id,
          message: `Failed to generate podcast: ${formatError(error)}`,
          cause: error,
        }),
      ),
    ),
    Effect.withSpan('worker.handleGeneratePodcast', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'podcast.id': job.payload.podcastId,
      },
    }),
  );

export const handleGenerateScript = (job: Job<GenerateScriptPayload>) =>
  Effect.gen(function* () {
    const { podcastId, promptInstructions } = job.payload;

    const result: UseCaseScriptResult = yield* generateScript({
      podcastId,
      promptInstructions,
    });

    yield* syncEntityTitle(result.podcast.id, result.podcast.title);
    yield* generateCoverImage({ podcastId: result.podcast.id });

    return {
      podcastId: result.podcast.id,
      segmentCount: result.segmentCount,
    } satisfies GenerateScriptResult;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(
        new JobProcessingError({
          jobId: job.id,
          message: `Failed to generate script: ${formatError(error)}`,
          cause: error,
        }),
      ),
    ),
    Effect.withSpan('worker.handleGenerateScript', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'podcast.id': job.payload.podcastId,
      },
    }),
  );

export const handleGenerateAudio = (job: Job<GenerateAudioPayload>) =>
  Effect.gen(function* () {
    const { podcastId } = job.payload;

    const result: UseCaseAudioResult = yield* generateAudio({ podcastId });

    return {
      audioUrl: result.audioUrl,
      duration: result.duration,
    } satisfies GenerateAudioResult;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(
        new JobProcessingError({
          jobId: job.id,
          message: `Failed to generate audio: ${formatError(error)}`,
          cause: error,
        }),
      ),
    ),
    Effect.withSpan('worker.handleGenerateAudio', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'podcast.id': job.payload.podcastId,
      },
    }),
  );
