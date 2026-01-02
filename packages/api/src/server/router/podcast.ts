import {
  PodcastRepo,
  ScriptVersionRepo,
  listPodcasts,
  getPodcast,
  createPodcast,
  updatePodcast,
  deletePodcast,
  saveChanges,
  getActiveScript,
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
import { handleEffectWithProtocol, type ErrorFactory } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import {
  serializePodcast,
  serializePodcastScript,
  serializePodcastFull,
  serializePodcastListItem,
} from '@repo/db/schema';

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
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listPodcasts({
          userId: context.session.user.id,
          limit: input.limit,
          offset: input.offset,
        }).pipe(Effect.map((result) => (result as { podcasts: Parameters<typeof serializePodcastListItem>[0][] }).podcasts.map(serializePodcastListItem))),
        errors as unknown as ErrorFactory,
        {
          span: 'api.podcasts.list',
          attributes: {
            'pagination.limit': input.limit ?? 50,
            'pagination.offset': input.offset ?? 0,
          },
        },
      );
    },
  ),

  get: protectedProcedure.podcasts.get.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getPodcast({ podcastId: input.id, includeVersion: true }).pipe(
          Effect.map((podcast) => {
            const p = podcast as Parameters<typeof serializePodcastFull>[0] & { activeVersion?: unknown };
            return serializePodcastFull({
              ...p,
              activeVersion: p.activeVersion ?? null,
            });
          }),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.podcasts.get',
          attributes: { 'podcast.id': input.id },
        },
      );
    },
  ),

  create: protectedProcedure.podcasts.create.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createPodcast({
          ...input,
          userId: context.session.user.id,
        }).pipe(Effect.map((podcastFull) => serializePodcastFull(podcastFull as Parameters<typeof serializePodcastFull>[0]))),
        errors as unknown as ErrorFactory,
        {
          span: 'api.podcasts.create',
          attributes: { 'podcast.title': input.title ?? 'Untitled' },
        },
      );
    },
  ),

  update: protectedProcedure.podcasts.update.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;

      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        updatePodcast({ podcastId: id as string, data }).pipe(
          Effect.map((podcast) => serializePodcast(podcast as Parameters<typeof serializePodcast>[0])),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.podcasts.update',
          attributes: { 'podcast.id': id },
        },
      );
    },
  ),

  delete: protectedProcedure.podcasts.delete.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        deletePodcast({ podcastId: input.id }).pipe(Effect.map(() => ({}))),
        errors as unknown as ErrorFactory,
        {
          span: 'api.podcasts.delete',
          attributes: { 'podcast.id': input.id },
        },
      );
    },
  ),

  getScript: protectedProcedure.podcasts.getScript.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getActiveScript({ podcastId: input.id }).pipe(Effect.map(serializePodcastScript)),
        errors as unknown as ErrorFactory,
        {
          span: 'api.podcasts.getScript',
          attributes: { 'podcast.id': input.id },
        },
      );
    },
  ),

  generate: protectedProcedure.podcasts.generate.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
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
        errors as unknown as ErrorFactory,
        { span: 'api.podcasts.generate', attributes: { 'podcast.id': input.id } },
      );
    },
  ),

  getJob: protectedProcedure.podcasts.getJob.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        Effect.gen(function* () {
          const queue = yield* Queue;
          const job = yield* queue.getJob(input.jobId);
          return serializeJob(job);
        }),
        errors as unknown as ErrorFactory,
        { span: 'api.podcasts.getJob', attributes: { 'job.id': input.jobId } },
      );
    },
  ),

  saveChanges: protectedProcedure.podcasts.saveChanges.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
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
            // No changes - throw error to indicate nothing to do
            throw errors.NOT_FOUND({
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
        errors as unknown as ErrorFactory,
        { span: 'api.podcasts.saveChanges', attributes: { 'podcast.id': input.id } },
        {
          // InvalidSaveError doesn't have HTTP protocol, so we need a custom handler
          InvalidSaveError: (e: unknown) => {
            const message = (e as { message?: string })?.message ?? 'Invalid save operation';
            throw errors.NOT_FOUND({
              message,
              data: { podcastId: input.id },
            });
          },
        },
      );
    },
  ),
};

export default podcastRouter;
