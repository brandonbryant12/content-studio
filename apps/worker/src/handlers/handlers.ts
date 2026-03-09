import { SourceStatus } from '@repo/db/schema';
import {
  generateScript,
  generateAudio,
  generateCoverImage,
  syncEntityTitle,
  PodcastRepo,
  awaitSourcesReady,
  type GenerateScriptResult as UseCaseScriptResult,
  type GenerateAudioResult as UseCaseAudioResult,
} from '@repo/media';
import { Effect } from 'effect';
import type {
  GeneratePodcastPayload,
  GeneratePodcastResult,
  GenerateScriptPayload,
  GenerateScriptResult,
  GenerateAudioPayload,
  GenerateAudioResult,
} from '@repo/queue';
import { emitEntityChange, type PublishEvent } from '../events';
import { defineJobHandler } from './job-handler';

export const createGeneratePodcastHandler = (publishEvent: PublishEvent) =>
  defineJobHandler<GeneratePodcastPayload>()({
    span: 'worker.handleGeneratePodcast',
    errorMessage: 'Failed to generate podcast',
    attributes: (job) => ({
      'podcast.id': job.payload.podcastId,
    }),
    run: (job) =>
      Effect.gen(function* () {
        const { podcastId, promptInstructions } = job.payload;

        // Wait for any pending research sources before generating script
        const podcastRepo = yield* PodcastRepo;
        const podcast = yield* podcastRepo.findById(podcastId);
        const pendingSources = podcast.sources.filter(
          (d) => d.status !== SourceStatus.READY,
        );
        if (pendingSources.length > 0) {
          yield* Effect.logInfo(
            `Waiting for ${pendingSources.length} source(s) to become ready...`,
          );
          yield* awaitSourcesReady({
            sourceIds: pendingSources.map((d) => d.id),
          });
        }

        const scriptResult: UseCaseScriptResult = yield* generateScript({
          podcastId,
          promptInstructions,
        });

        emitEntityChange(
          publishEvent,
          job.payload.userId,
          'podcast',
          scriptResult.podcast.id,
        );

        yield* syncEntityTitle(
          scriptResult.podcast.id,
          scriptResult.podcast.title,
        );
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
      }),
  });

export const handleGenerateScript = defineJobHandler<GenerateScriptPayload>()({
  span: 'worker.handleGenerateScript',
  errorMessage: 'Failed to generate script',
  attributes: (job) => ({
    'podcast.id': job.payload.podcastId,
  }),
  run: (job) =>
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
    }),
});

export const handleGenerateAudio = defineJobHandler<GenerateAudioPayload>()({
  span: 'worker.handleGenerateAudio',
  errorMessage: 'Failed to generate audio',
  attributes: (job) => ({
    'podcast.id': job.payload.podcastId,
  }),
  run: (job) =>
    Effect.gen(function* () {
      const { podcastId } = job.payload;

      const result: UseCaseAudioResult = yield* generateAudio({ podcastId });

      return {
        audioUrl: result.audioUrl,
        duration: result.duration,
      } satisfies GenerateAudioResult;
    }),
});
