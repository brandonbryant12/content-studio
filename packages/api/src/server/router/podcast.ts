import {
  listPodcasts,
  getPodcast,
  createPodcast,
  updatePodcast,
  deletePodcast,
  startGeneration,
  saveAndQueueAudio,
  getJob,
  // Collaboration
  listCollaborators,
  addCollaborator,
  removeCollaborator,
  approvePodcast,
  revokeApproval,
  claimPendingInvites,
} from '@repo/media';
import { Effect } from 'effect';
import type { CollaboratorId } from '@repo/db/schema';
import { handleEffectWithProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import { tapLogActivity, tapSyncTitle } from './log-activity';
import {
  serializePodcastEffect,
  serializePodcastFullEffect,
  serializePodcastListItemsEffect,
  serializeCollaboratorWithUserEffect,
  serializeCollaboratorsWithUserEffect,
  serializeJob,
  type Job,
} from '@repo/db/schema';

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
        getPodcast({ podcastId: input.id, includeDocuments: true }).pipe(
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
        getJob({ jobId: input.jobId }).pipe(
          Effect.map((job) => serializeJob(job as unknown as Job)),
        ),
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

  // =========================================================================
  // Collaborator Handlers
  // =========================================================================

  listCollaborators: protectedProcedure.podcasts.listCollaborators.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listCollaborators({ podcastId: input.id }).pipe(
          Effect.flatMap((result) =>
            serializeCollaboratorsWithUserEffect([...result.collaborators]),
          ),
        ),
        errors,
        {
          span: 'api.podcasts.listCollaborators',
          attributes: { 'podcast.id': input.id },
        },
      );
    },
  ),

  addCollaborator: protectedProcedure.podcasts.addCollaborator.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        addCollaborator({
          podcastId: input.id,
          email: input.email,
          addedBy: context.session.user.id,
        }).pipe(
          Effect.flatMap((result) =>
            serializeCollaboratorWithUserEffect(result.collaborator),
          ),
        ),
        errors,
        {
          span: 'api.podcasts.addCollaborator',
          attributes: {
            'podcast.id': input.id,
            'collaborator.email': input.email,
          },
        },
      );
    },
  ),

  removeCollaborator: protectedProcedure.podcasts.removeCollaborator.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        removeCollaborator({
          collaboratorId: input.collaboratorId as CollaboratorId,
        }).pipe(Effect.map(() => ({}))),
        errors,
        {
          span: 'api.podcasts.removeCollaborator',
          attributes: {
            'podcast.id': input.id,
            'collaborator.id': input.collaboratorId,
          },
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

  claimInvites: protectedProcedure.podcasts.claimInvites.handler(
    async ({ context, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        claimPendingInvites({
          email: context.session.user.email,
          userId: context.session.user.id,
        }),
        errors,
        {
          span: 'api.podcasts.claimInvites',
          attributes: { 'user.id': context.session.user.id },
        },
      );
    },
  ),
};

export default podcastRouter;
