import { ImageGen } from '@repo/ai';
import {
  generateScript,
  generateAudio,
  PodcastRepo,
  syncEntityTitle,
  type GenerateScriptResult as UseCaseScriptResult,
  type GenerateAudioResult as UseCaseAudioResult,
} from '@repo/media';
import { JobProcessingError, formatError } from '@repo/queue';
import { Storage } from '@repo/storage';
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

export interface HandlerOptions {
  onScriptComplete?: (podcastId: string) => void;
}

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

export const handleGeneratePodcast = (
  job: Job<GeneratePodcastPayload>,
  options?: HandlerOptions,
) =>
  Effect.gen(function* () {
    const { podcastId, promptInstructions } = job.payload;

    const scriptResult: UseCaseScriptResult = yield* generateScript({
      podcastId,
      promptInstructions,
    });

    yield* syncEntityTitle(scriptResult.podcast.id, scriptResult.podcast.title);
    options?.onScriptComplete?.(scriptResult.podcast.id);
    yield* generateCoverImage(scriptResult.podcast);

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
    yield* generateCoverImage(result.podcast);

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
