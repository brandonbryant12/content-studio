import {
  serializePodcastEffect,
  serializePodcastFullEffect,
  serializePodcastListItemsEffect,
  serializeJobEffect,
} from '@repo/db/schema';
import {
  listPodcasts,
  getPodcast,
  createPodcast,
  updatePodcast,
  deletePodcast,
  startGeneration,
  saveAndQueueAudio,
  getJob,
  approvePodcast,
  revokeApproval,
} from '@repo/media';
import { Effect } from 'effect';
import { handleEffectWithProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import { tapLogActivity, tapSyncTitle } from './log-activity';

const podcastRouter = {
  list: protectedProcedure.podcasts.list.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listPodcasts({
          limit: input.limit,
          offset: input.offset,
        }).pipe(
          Effect.flatMap((result) =>
            serializePodcastListItemsEffect([...result.podcasts]),
          ),
        ),
        errors,
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
        getPodcast({ podcastId: input.id }).pipe(
          Effect.flatMap(serializePodcastFullEffect),
        ),
        errors,
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
        createPodcast(input).pipe(
          Effect.flatMap(serializePodcastFullEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'podcast'),
        ),
        errors,
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
          Effect.flatMap(serializePodcastEffect),
          tapSyncTitle(context.runtime, context.user),
        ),
        errors,
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
        deletePodcast({ podcastId: input.id }).pipe(
          Effect.map(() => ({})),
          tapLogActivity(
            context.runtime,
            context.user,
            'deleted',
            'podcast',
            input.id,
          ),
        ),
        errors,
        {
          span: 'api.podcasts.delete',
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
        errors,
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
        getJob({ jobId: input.jobId }).pipe(Effect.flatMap(serializeJobEffect)),
        errors,
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
        errors,
        {
          span: 'api.podcasts.saveChanges',
          attributes: { 'podcast.id': input.id },
        },
      );
    },
  ),

  approve: protectedProcedure.podcasts.approve.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        approvePodcast({ podcastId: input.id }).pipe(
          Effect.flatMap((result) => serializePodcastEffect(result.podcast)),
        ),
        errors,
        {
          span: 'api.podcasts.approve',
          attributes: { 'podcast.id': input.id },
        },
      );
    },
  ),

  revokeApproval: protectedProcedure.podcasts.revokeApproval.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        revokeApproval({ podcastId: input.id }).pipe(
          Effect.flatMap((result) => serializePodcastEffect(result.podcast)),
        ),
        errors,
        {
          span: 'api.podcasts.revokeApproval',
          attributes: { 'podcast.id': input.id },
        },
      );
    },
  ),
};

export default podcastRouter;
