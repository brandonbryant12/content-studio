import {
  listPodcasts,
  getPodcast,
  createPodcast,
  updatePodcast,
  deletePodcast,
  getActiveScript,
  startGeneration,
  saveAndQueueAudio,
  getJob,
} from '@repo/media';
import { Effect } from 'effect';
import type { Job } from '@repo/db/schema';
import type { GeneratePodcastResult, GenerateAudioResult } from '@repo/queue';
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
        }).pipe(
          Effect.map((result) =>
            [...result.podcasts].map(serializePodcastListItem),
          ),
        ),
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
            const p = podcast as Parameters<typeof serializePodcastFull>[0] & {
              activeVersion?: unknown;
            };
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
        }).pipe(
          Effect.map((podcastFull) =>
            serializePodcastFull(
              podcastFull as Parameters<typeof serializePodcastFull>[0],
            ),
          ),
        ),
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
          Effect.map((podcast) =>
            serializePodcast(podcast as Parameters<typeof serializePodcast>[0]),
          ),
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
        getActiveScript({ podcastId: input.id }).pipe(
          Effect.map(serializePodcastScript),
        ),
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
        startGeneration({
          podcastId: input.id,
          promptInstructions: input.promptInstructions,
        }),
        errors as unknown as ErrorFactory,
        {
          span: 'api.podcasts.generate',
          attributes: { 'podcast.id': input.id },
        },
      );
    },
  ),

  getJob: protectedProcedure.podcasts.getJob.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getJob({ jobId: input.jobId }).pipe(Effect.map(serializeJob)),
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
        saveAndQueueAudio({
          podcastId: input.id,
          segments: input.segments ? [...input.segments] : undefined,
          hostVoice: input.hostVoice,
          hostVoiceName: input.hostVoiceName,
          coHostVoice: input.coHostVoice,
          coHostVoiceName: input.coHostVoiceName,
        }),
        errors as unknown as ErrorFactory,
        {
          span: 'api.podcasts.saveChanges',
          attributes: { 'podcast.id': input.id },
        },
      );
    },
  ),
};

export default podcastRouter;
