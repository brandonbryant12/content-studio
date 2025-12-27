import {
  PodcastRepo,
  ScriptVersionRepo,
  listPodcasts,
  getPodcast,
  createPodcast,
  updatePodcast,
  deletePodcast,
  editScript,
  restoreVersion,
} from '@repo/media';
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
  serializePodcastListItem,
} from '../serializers';

/**
 * Job result union type - matches contract schema.
 */
type JobResult =
  | GeneratePodcastResult
  | GenerateScriptResult
  | GenerateAudioResult;

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
        listPodcasts({
          userId: context.session.user.id,
          limit: input.limit,
          offset: input.offset,
        }).pipe(
          Effect.map((result) => result.podcasts.map(serializePodcastListItem)),
          Effect.provide(context.layers),
        ),
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
        getPodcast({ podcastId: input.id, includeVersion: true }).pipe(
          Effect.map((podcast) =>
            serializePodcastFull({
              ...podcast,
              activeVersion: 'activeVersion' in podcast ? podcast.activeVersion : null,
            }),
          ),
          Effect.provide(context.layers),
        ),
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
        createPodcast({
          ...input,
          userId: context.session.user.id,
        }).pipe(
          Effect.map((podcastFull) => serializePodcastFull(podcastFull)),
          Effect.provide(context.layers),
        ),
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
        updatePodcast({ podcastId: id, data }).pipe(
          Effect.map((result) => serializePodcast(result.podcast)),
          Effect.provide(context.layers),
        ),
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
              message: e.message ?? 'No active script found',
              data: { podcastId: e.podcastId },
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
        deletePodcast({ podcastId: input.id }).pipe(
          Effect.map(() => ({})),
          Effect.provide(context.layers),
        ),
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
          const scriptVersionRepo = yield* ScriptVersionRepo;
          const version = yield* scriptVersionRepo.findActiveByPodcastId(input.id);
          if (!version) {
            throw errors.SCRIPT_NOT_FOUND({
              message: 'No active script found',
              data: { podcastId: input.id },
            });
          }
          return serializePodcastScript(version);
        }).pipe(Effect.provide(context.layers)),
        {
          ...handlers.common,
          ...handlers.database,
        },
      );
    },
  ),

  updateScript: protectedProcedure.podcasts.updateScript.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      const { id, segments } = input;

      return handleEffect(
        editScript({
          podcastId: id,
          segments,
        }).pipe(
          Effect.map((result) => serializePodcastScript(result.version)),
          Effect.provide(context.layers),
        ),
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
              message: e.message ?? 'No active script found',
              data: { podcastId: e.podcastId },
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
          const podcastRepo = yield* PodcastRepo;
          const scriptVersionRepo = yield* ScriptVersionRepo;
          const queue = yield* Queue;

          // Verify podcast exists and user has access
          const podcast = yield* podcastRepo.findById(input.id);

          // Check for existing pending/processing job (idempotency)
          const existingJob = yield* queue.findPendingJobForPodcast(podcast.id);
          if (existingJob) {
            return {
              jobId: existingJob.id,
              status: existingJob.status,
            };
          }

          // Get active version and update its status, or create a new draft version
          const activeVersion = yield* scriptVersionRepo.findActiveByPodcastId(podcast.id);
          if (activeVersion) {
            yield* scriptVersionRepo.updateStatus(activeVersion.id, 'draft');
          } else {
            // Create a new draft version for brand new podcasts
            // This ensures isSetupMode() returns false after generate is called
            yield* scriptVersionRepo.insert({
              podcastId: podcast.id,
              status: 'draft',
              segments: null,
              sourceDocumentIds: podcast.sourceDocumentIds,
              hostVoice: podcast.hostVoice,
              coHostVoice: podcast.coHostVoice,
              promptInstructions: podcast.promptInstructions,
            });
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
          ScriptNotFound: (e) => {
            throw errors.SCRIPT_NOT_FOUND({
              message: e.message ?? 'No active script found',
              data: { podcastId: e.podcastId },
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
          const podcastRepo = yield* PodcastRepo;
          const scriptVersionRepo = yield* ScriptVersionRepo;
          const queue = yield* Queue;

          // Verify podcast exists and user has access
          const podcast = yield* podcastRepo.findById(input.id);

          // Check for existing pending/processing job (idempotency)
          const existingJob = yield* queue.findPendingJobForPodcast(podcast.id);
          if (existingJob) {
            return {
              jobId: existingJob.id,
              status: existingJob.status,
            };
          }

          // Get active version and update its status
          const activeVersion = yield* scriptVersionRepo.findActiveByPodcastId(podcast.id);
          if (activeVersion) {
            yield* scriptVersionRepo.updateStatus(activeVersion.id, 'draft');
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
          ScriptNotFound: (e) => {
            throw errors.SCRIPT_NOT_FOUND({
              message: e.message ?? 'No active script found',
              data: { podcastId: e.podcastId },
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
          const podcastRepo = yield* PodcastRepo;
          const scriptVersionRepo = yield* ScriptVersionRepo;
          const queue = yield* Queue;

          // Verify podcast exists and user has access
          const podcast = yield* podcastRepo.findById(input.id);

          // Get active version and verify status
          const activeVersion = yield* scriptVersionRepo.findActiveByPodcastId(podcast.id);
          if (!activeVersion) {
            throw errors.SCRIPT_NOT_FOUND({
              message: 'No active script version found',
              data: { podcastId: podcast.id },
            });
          }

          if (activeVersion.status !== 'script_ready') {
            throw errors.FORBIDDEN({
              message: `Script must be in script_ready status to generate audio. Current status: ${activeVersion.status}`,
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

          // Update version status to generating_audio
          yield* scriptVersionRepo.updateStatus(activeVersion.id, 'generating_audio');

          // Enqueue the audio-only generation job
          const payload: GenerateAudioPayload = {
            versionId: activeVersion.id,
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
          ScriptNotFound: (e) => {
            throw errors.SCRIPT_NOT_FOUND({
              message: e.message ?? 'No active script found',
              data: { podcastId: e.podcastId },
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
          const podcastRepo = yield* PodcastRepo;
          const scriptVersionRepo = yield* ScriptVersionRepo;

          // Verify podcast exists
          yield* podcastRepo.findById(input.id);

          const versions = yield* scriptVersionRepo.listByPodcastId(input.id);
          return versions.map((v) => ({
            id: v.id,
            version: v.version,
            isActive: v.isActive,
            status: v.status,
            segmentCount: v.segmentCount,
            hasAudio: v.hasAudio,
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

  getScriptVersion: protectedProcedure.podcasts.getScriptVersion.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        Effect.gen(function* () {
          const podcastRepo = yield* PodcastRepo;
          const scriptVersionRepo = yield* ScriptVersionRepo;

          // Verify podcast exists
          yield* podcastRepo.findById(input.id);

          const script = yield* scriptVersionRepo.findById(input.scriptId);

          // Verify script belongs to the podcast
          if (script.podcastId !== input.id) {
            throw errors.SCRIPT_NOT_FOUND({
              message: 'Script version not found for this podcast',
              data: { podcastId: input.id },
            });
          }

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

  restoreScriptVersion:
    protectedProcedure.podcasts.restoreScriptVersion.handler(
      async ({ context, input, errors }) => {
        const handlers = createErrorHandlers(errors);
        return handleEffect(
          restoreVersion({
            podcastId: input.id,
            versionId: input.scriptId,
          }).pipe(
            Effect.map((result) => serializePodcastScript(result.restoredVersion)),
            Effect.provide(context.layers),
          ),
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
