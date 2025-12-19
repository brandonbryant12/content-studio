import { Podcasts } from '@repo/media';
import { Queue } from '@repo/queue';
import { Effect } from 'effect';
import type { Job } from '@repo/db/schema';
import type {
  GeneratePodcastPayload,
  GeneratePodcastResult,
  GenerateScriptPayload,
  GenerateScriptResult,
  GenerateAudioPayload,
  GenerateAudioResult,
} from '@repo/queue';
import { createErrorHandlers, handleEffect } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import {
  serializePodcast,
  serializePodcastScript,
  serializePodcastFull,
} from '../serializers';

/**
 * Job result union type - matches contract schema.
 */
type JobResult = GeneratePodcastResult | GenerateScriptResult | GenerateAudioResult;

/**
 * Serialized job output type.
 */
interface JobOutput {
  id: string;
  type: string;
  status: Job['status'];
  result: JobResult | null;
  error: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * Serialize a job for API output.
 */
const serializeJob = (job: {
  id: string;
  type: string;
  status: Job['status'];
  result: unknown;
  error: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}): JobOutput => ({
  id: job.id,
  type: job.type,
  status: job.status,
  result: job.result as JobResult | null,
  error: job.error,
  createdBy: job.createdBy,
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
  startedAt: job.startedAt?.toISOString() ?? null,
  completedAt: job.completedAt?.toISOString() ?? null,
});

const podcastRouter = {
  list: protectedProcedure.podcasts.list.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const podcasts = yield* Podcasts;
          const result = yield* podcasts.list(input);
          return result.map(serializePodcast);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
        },
      );
    },
  ),

  get: protectedProcedure.podcasts.get.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const podcasts = yield* Podcasts;
          const result = yield* podcasts.findById(input.id);
          return serializePodcastFull(result);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          PodcastNotFound: (e) => {
            throw errors.PODCAST_NOT_FOUND({
              message: e.message ?? `Podcast ${e.id} not found`,
              data: { podcastId: e.id },
            });
          },
        },
      );
    },
  ),

  create: protectedProcedure.podcasts.create.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const podcasts = yield* Podcasts;
          const result = yield* podcasts.create(input);
          // Return full podcast shape with script (null for new podcasts)
          return serializePodcastFull({ ...result, script: null });
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          DocumentNotFound: (e) => {
            throw errors.DOCUMENT_NOT_FOUND({
              message:
                e.message ?? `Document ${e.id} not found or access denied`,
              data: { documentId: e.id },
            });
          },
        },
      );
    },
  ),

  update: protectedProcedure.podcasts.update.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      const { id, ...data } = input;

      return handleEffect(
        Effect.gen(function* () {
          const podcasts = yield* Podcasts;
          const result = yield* podcasts.update(id, data);
          return serializePodcast(result);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          PodcastNotFound: (e) => {
            throw errors.PODCAST_NOT_FOUND({
              message: e.message ?? `Podcast ${e.id} not found`,
              data: { podcastId: e.id },
            });
          },
          DocumentNotFound: (e) => {
            throw errors.NOT_FOUND({
              message: e.message ?? `Document ${e.id} not found`,
              data: { documentId: e.id },
            });
          },
        },
      );
    },
  ),

  delete: protectedProcedure.podcasts.delete.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const podcasts = yield* Podcasts;
          yield* podcasts.delete(input.id);
          return {};
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          PodcastNotFound: (e) => {
            throw errors.PODCAST_NOT_FOUND({
              message: e.message ?? `Podcast ${e.id} not found`,
              data: { podcastId: e.id },
            });
          },
        },
      );
    },
  ),

  getScript: protectedProcedure.podcasts.getScript.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const podcasts = yield* Podcasts;
          const result = yield* podcasts.getScript(input.id);
          return serializePodcastScript(result);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          PodcastNotFound: (e) => {
            throw errors.PODCAST_NOT_FOUND({
              message: e.message ?? `Podcast ${e.id} not found`,
              data: { podcastId: e.id },
            });
          },
          ScriptNotFound: (e) => {
            throw errors.SCRIPT_NOT_FOUND({
              message: e.message ?? 'Script not found',
              data: { podcastId: e.podcastId },
            });
          },
        },
      );
    },
  ),

  updateScript: protectedProcedure.podcasts.updateScript.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      const { id, ...data } = input;

      return handleEffect(
        Effect.gen(function* () {
          const podcasts = yield* Podcasts;
          const result = yield* podcasts.updateScript(id, data);
          return serializePodcastScript(result);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          PodcastNotFound: (e) => {
            throw errors.PODCAST_NOT_FOUND({
              message: e.message ?? `Podcast ${e.id} not found`,
              data: { podcastId: e.id },
            });
          },
        },
      );
    },
  ),

  generate: protectedProcedure.podcasts.generate.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const podcasts = yield* Podcasts;
          const queue = yield* Queue;

          // Verify podcast exists and user has access
          const podcast = yield* podcasts.findById(input.id);

          // Check for existing pending/processing job (idempotency)
          const existingJob = yield* queue.findPendingJobForPodcast(podcast.id);
          if (existingJob) {
            return {
              jobId: existingJob.id,
              status: existingJob.status,
            };
          }

          // Enqueue the combined generation job
          const payload: GeneratePodcastPayload = {
            podcastId: podcast.id,
            userId: podcast.createdBy,
            promptInstructions: input.promptInstructions,
          };

          const job = yield* queue.enqueue(
            'generate-podcast',
            payload,
            podcast.createdBy,
          );

          // Job will be picked up by the polling worker

          return {
            jobId: job.id,
            status: job.status,
          };
        }).pipe(
          Effect.withSpan('api.podcasts.generate', {
            attributes: { 'podcast.id': input.id },
          }),
          Effect.provide(context.layers),
        ),
        {
          ...handlers.common,
          ...handlers.database,
          ...handlers.queue,
          PodcastNotFound: (e) => {
            throw errors.PODCAST_NOT_FOUND({
              message: e.message ?? `Podcast ${e.id} not found`,
              data: { podcastId: e.id },
            });
          },
        },
      );
    },
  ),

  getJob: protectedProcedure.podcasts.getJob.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const queue = yield* Queue;
          const job = yield* queue.getJob(input.jobId);
          return serializeJob(job);
        }).pipe(
          Effect.withSpan('api.podcasts.getJob', {
            attributes: { 'job.id': input.jobId },
          }),
          Effect.provide(context.layers),
        ),
        {
          ...handlers.common,
          ...handlers.database,
          ...handlers.queue,
        },
      );
    },
  ),

  generateScript: protectedProcedure.podcasts.generateScript.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const podcasts = yield* Podcasts;
          const queue = yield* Queue;

          // Verify podcast exists and user has access
          const podcast = yield* podcasts.findById(input.id);

          // Check for existing pending/processing job (idempotency)
          const existingJob = yield* queue.findPendingJobForPodcast(podcast.id);
          if (existingJob) {
            return {
              jobId: existingJob.id,
              status: existingJob.status,
            };
          }

          // Enqueue the script-only generation job
          const payload: GenerateScriptPayload = {
            podcastId: podcast.id,
            userId: podcast.createdBy,
            promptInstructions: input.promptInstructions,
          };

          const job = yield* queue.enqueue(
            'generate-script',
            payload,
            podcast.createdBy,
          );

          return {
            jobId: job.id,
            status: job.status,
          };
        }).pipe(
          Effect.withSpan('api.podcasts.generateScript', {
            attributes: { 'podcast.id': input.id },
          }),
          Effect.provide(context.layers),
        ),
        {
          ...handlers.common,
          ...handlers.database,
          ...handlers.queue,
          PodcastNotFound: (e) => {
            throw errors.PODCAST_NOT_FOUND({
              message: e.message ?? `Podcast ${e.id} not found`,
              data: { podcastId: e.id },
            });
          },
        },
      );
    },
  ),

  generateAudio: protectedProcedure.podcasts.generateAudio.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const podcasts = yield* Podcasts;
          const queue = yield* Queue;

          // Verify podcast exists and user has access
          const podcast = yield* podcasts.findById(input.id);

          // Verify podcast is in script_ready status
          if (podcast.status !== 'script_ready') {
            throw errors.FORBIDDEN({
              message: `Podcast must be in script_ready status to generate audio. Current status: ${podcast.status}`,
            });
          }

          // Check for existing pending/processing job (idempotency)
          const existingJob = yield* queue.findPendingJobForPodcast(podcast.id);
          if (existingJob) {
            return {
              jobId: existingJob.id,
              status: existingJob.status,
            };
          }

          // Enqueue the audio-only generation job
          const payload: GenerateAudioPayload = {
            podcastId: podcast.id,
            userId: podcast.createdBy,
          };

          const job = yield* queue.enqueue(
            'generate-audio',
            payload,
            podcast.createdBy,
          );

          return {
            jobId: job.id,
            status: job.status,
          };
        }).pipe(
          Effect.withSpan('api.podcasts.generateAudio', {
            attributes: { 'podcast.id': input.id },
          }),
          Effect.provide(context.layers),
        ),
        {
          ...handlers.common,
          ...handlers.database,
          ...handlers.queue,
          PodcastNotFound: (e) => {
            throw errors.PODCAST_NOT_FOUND({
              message: e.message ?? `Podcast ${e.id} not found`,
              data: { podcastId: e.id },
            });
          },
        },
      );
    },
  ),

  listScriptVersions: protectedProcedure.podcasts.listScriptVersions.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const podcasts = yield* Podcasts;
          const versions = yield* podcasts.listScriptVersions(input.id);
          return versions.map((v) => ({
            id: v.id,
            version: v.version,
            isActive: v.isActive,
            segmentCount: v.segmentCount,
            createdAt: v.createdAt.toISOString(),
          }));
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          PodcastNotFound: (e) => {
            throw errors.PODCAST_NOT_FOUND({
              message: e.message ?? `Podcast ${e.id} not found`,
              data: { podcastId: e.id },
            });
          },
        },
      );
    },
  ),

  restoreScriptVersion: protectedProcedure.podcasts.restoreScriptVersion.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const podcasts = yield* Podcasts;
          const script = yield* podcasts.restoreScriptVersion(input.id, input.scriptId);
          return serializePodcastScript(script);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
          PodcastNotFound: (e) => {
            throw errors.PODCAST_NOT_FOUND({
              message: e.message ?? `Podcast ${e.id} not found`,
              data: { podcastId: e.id },
            });
          },
          ScriptNotFound: (e) => {
            throw errors.SCRIPT_NOT_FOUND({
              message: e.message ?? 'Script version not found',
              data: { podcastId: e.podcastId },
            });
          },
        },
      );
    },
  ),
};

export default podcastRouter;
