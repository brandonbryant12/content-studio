import {
  PodcastRepo,
  ScriptVersionRepo,
  listPodcasts,
  getPodcast,
  createPodcast,
  updatePodcast,
  deletePodcast,
  saveChanges,
} from '@repo/media';
import { Queue } from '@repo/queue';
import { Effect } from 'effect';
import type { Job } from '@repo/db/schema';
import type {
  GeneratePodcastPayload,
  GeneratePodcastResult,
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
} from '@repo/db';

/**
 * Job result union type - matches contract schema.
 */
type JobResult = GeneratePodcastResult | GenerateAudioResult;

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
        context.runtime,
        context.user,
        listPodcasts({
          userId: context.session.user.id,
          limit: input.limit,
          offset: input.offset,
        }).pipe(Effect.map((result) => result.podcasts.map(serializePodcastListItem))),
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
        context.runtime,
        context.user,
        getPodcast({ podcastId: input.id, includeVersion: true }).pipe(
          Effect.map((podcast) =>
            serializePodcastFull({
              ...podcast,
              activeVersion: 'activeVersion' in podcast ? podcast.activeVersion : null,
            }),
          ),
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
        context.runtime,
        context.user,
        createPodcast({
          ...input,
          userId: context.session.user.id,
        }).pipe(Effect.map((podcastFull) => serializePodcastFull(podcastFull))),
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
        context.runtime,
        context.user,
        updatePodcast({ podcastId: id as string, data }).pipe(
          Effect.map((podcast) => serializePodcast(podcast)),
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

  delete: protectedProcedure.podcasts.delete.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        context.runtime,
        context.user,
        deletePodcast({ podcastId: input.id }).pipe(Effect.map(() => ({}))),
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
        context.runtime,
        context.user,
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
        }),
        {
          ...handlers.common,
          ...handlers.database,
        },
      );
    },
  ),

  generate: protectedProcedure.podcasts.generate.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        context.runtime,
        context.user,
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

          // Get active version and update its status, or create a new drafting version
          const activeVersion = yield* scriptVersionRepo.findActiveByPodcastId(podcast.id);
          if (activeVersion) {
            yield* scriptVersionRepo.updateStatus(activeVersion.id, 'drafting');
          } else {
            // Create a new drafting version for brand new podcasts
            // This ensures isSetupMode() returns false after generate is called
            yield* scriptVersionRepo.insert({
              podcastId: podcast.id,
              createdBy: podcast.createdBy,
              status: 'drafting',
              segments: null,
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
        }),
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
        { span: 'api.podcasts.generate', attributes: { 'podcast.id': input.id } },
      );
    },
  ),

  getJob: protectedProcedure.podcasts.getJob.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        context.runtime,
        context.user,
        Effect.gen(function* () {
          const queue = yield* Queue;
          const job = yield* queue.getJob(input.jobId);
          return serializeJob(job);
        }),
        {
          ...handlers.common,
          ...handlers.database,
          ...handlers.queue,
        },
        { span: 'api.podcasts.getJob', attributes: { 'job.id': input.jobId } },
      );
    },
  ),

  saveChanges: protectedProcedure.podcasts.saveChanges.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);
      return handleEffect(
        context.runtime,
        context.user,
        Effect.gen(function* () {
          const podcastRepo = yield* PodcastRepo;
          const queue = yield* Queue;

          // Verify podcast exists
          const podcast = yield* podcastRepo.findById(input.id);

          // Call saveChanges use case
          const result = yield* saveChanges({
            podcastId: input.id as string,
            segments: input.segments ? [...input.segments] : undefined,
            hostVoice: input.hostVoice,
            hostVoiceName: input.hostVoiceName,
            coHostVoice: input.coHostVoice,
            coHostVoiceName: input.coHostVoiceName,
          });

          if (!result.hasChanges) {
            // No changes, return a dummy response
            throw errors.PODCAST_NOT_FOUND({
              message: 'No changes to save',
              data: { podcastId: input.id },
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

          // Enqueue audio regeneration job
          const payload: GenerateAudioPayload = {
            versionId: result.version.id,
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
        }),
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
          InvalidSaveError: (e) => {
            throw errors.PODCAST_NOT_FOUND({
              message: e.message,
              data: { podcastId: input.id },
            });
          },
        },
        { span: 'api.podcasts.saveChanges', attributes: { 'podcast.id': input.id } },
      );
    },
  ),
};

export default podcastRouter;
