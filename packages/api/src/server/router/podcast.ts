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
  generatePodcastPlan,
  startGeneration,
  saveAndQueueAudio,
  getJob,
  approvePodcast,
  revokeApproval,
} from '@repo/media';
import { Effect } from 'effect';
import { bindEffectProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import { tapLogActivity, tapSyncTitle } from './log-activity';

const podcastRouter = {
  list: protectedProcedure.podcasts.list.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        listPodcasts(input).pipe(
          Effect.flatMap((result) =>
            serializePodcastListItemsEffect([...result.podcasts]),
          ),
        ),
        {
          attributes: {
            'pagination.limit': input.limit ?? 50,
            'pagination.offset': input.offset ?? 0,
          },
        },
      ),
  ),

  get: protectedProcedure.podcasts.get.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        getPodcast({ podcastId: input.id }).pipe(
          Effect.flatMap(serializePodcastFullEffect),
        ),
        {
          attributes: { 'podcast.id': input.id },
        },
      ),
  ),

  create: protectedProcedure.podcasts.create.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        createPodcast(input).pipe(
          Effect.flatMap(serializePodcastFullEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'podcast'),
        ),
        {
          attributes: { 'podcast.title': input.title ?? 'Untitled' },
        },
      ),
  ),

  update: protectedProcedure.podcasts.update.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;

      return bindEffectProtocol({ context, errors }).run(
        updatePodcast({ podcastId: id, data }).pipe(
          Effect.flatMap(serializePodcastEffect),
          tapSyncTitle(context.runtime, context.user),
        ),
        {
          attributes: { 'podcast.id': id },
        },
      );
    },
  ),

  delete: protectedProcedure.podcasts.delete.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        deletePodcast({ podcastId: input.id }).pipe(
          Effect.as({}),
          tapLogActivity(
            context.runtime,
            context.user,
            'deleted',
            'podcast',
            input.id,
          ),
        ),
        {
          attributes: { 'podcast.id': input.id },
        },
      ),
  ),

  generate: protectedProcedure.podcasts.generate.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        startGeneration({
          podcastId: input.id,
          promptInstructions: input.promptInstructions,
          ignoreEpisodePlan: input.ignoreEpisodePlan,
        }),
        {
          attributes: { 'podcast.id': input.id },
        },
      ),
  ),

  generatePlan: protectedProcedure.podcasts.generatePlan.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        generatePodcastPlan({ podcastId: input.id }).pipe(
          Effect.flatMap(serializePodcastEffect),
        ),
        {
          attributes: { 'podcast.id': input.id },
        },
      ),
  ),

  getJob: protectedProcedure.podcasts.getJob.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        getJob({ jobId: input.jobId }).pipe(Effect.flatMap(serializeJobEffect)),
        {
          attributes: { 'job.id': input.jobId },
        },
      ),
  ),

  saveChanges: protectedProcedure.podcasts.saveChanges.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        saveAndQueueAudio({
          podcastId: input.id,
          segments: input.segments && [...input.segments],
          hostVoice: input.hostVoice,
          hostVoiceName: input.hostVoiceName,
          coHostVoice: input.coHostVoice,
          coHostVoiceName: input.coHostVoiceName,
          hostPersonaId: input.hostPersonaId,
          coHostPersonaId: input.coHostPersonaId,
        }),
        {
          attributes: { 'podcast.id': input.id },
        },
      ),
  ),

  approve: protectedProcedure.podcasts.approve.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        approvePodcast({ podcastId: input.id }).pipe(
          Effect.flatMap((result) => serializePodcastEffect(result.podcast)),
        ),
        {
          attributes: { 'podcast.id': input.id },
        },
      ),
  ),

  revokeApproval: protectedProcedure.podcasts.revokeApproval.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        revokeApproval({ podcastId: input.id }).pipe(
          Effect.flatMap((result) => serializePodcastEffect(result.podcast)),
        ),
        {
          attributes: { 'podcast.id': input.id },
        },
      ),
  ),
};

export default podcastRouter;
