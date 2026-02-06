import {
  listVoiceovers,
  getVoiceover,
  createVoiceover,
  updateVoiceover,
  deleteVoiceover,
  startVoiceoverGeneration,
  getVoiceoverJob,
  // Collaboration
  listVoiceoverCollaborators,
  addVoiceoverCollaborator,
  removeVoiceoverCollaborator,
  approveVoiceover,
  revokeVoiceoverApproval,
  claimVoiceoverPendingInvites,
} from '@repo/media';
import { Effect } from 'effect';
import type { Job, VoiceoverCollaboratorId } from '@repo/db/schema';
import type { GenerateVoiceoverResult } from '@repo/queue';
import { handleEffectWithProtocol, type ErrorFactory } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import {
  serializeVoiceover,
  serializeVoiceoverListItem,
  serializeVoiceoverCollaboratorWithUser,
} from '@repo/db/schema';

/**
 * Job result type - matches contract schema.
 */
type JobResult = GenerateVoiceoverResult;

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

const voiceoverRouter = {
  list: protectedProcedure.voiceovers.list.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listVoiceovers({
          userId: context.session.user.id,
          limit: input.limit,
          offset: input.offset,
        }).pipe(
          Effect.map((result) =>
            [...result.voiceovers].map(serializeVoiceoverListItem),
          ),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.voiceovers.list',
          attributes: {
            'pagination.limit': input.limit ?? 50,
            'pagination.offset': input.offset ?? 0,
          },
        },
      );
    },
  ),

  get: protectedProcedure.voiceovers.get.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getVoiceover({ voiceoverId: input.id }).pipe(
          Effect.map((voiceover) => serializeVoiceover(voiceover)),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.voiceovers.get',
          attributes: { 'voiceover.id': input.id },
        },
      );
    },
  ),

  create: protectedProcedure.voiceovers.create.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        createVoiceover(input).pipe(Effect.map((voiceover) => serializeVoiceover(voiceover))),
        errors as unknown as ErrorFactory,
        {
          span: 'api.voiceovers.create',
          attributes: { 'voiceover.title': input.title },
        },
      );
    },
  ),

  update: protectedProcedure.voiceovers.update.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;

      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        updateVoiceover({
          voiceoverId: id as string,
          userId: context.session.user.id,
          data,
        }).pipe(Effect.map((voiceover) => serializeVoiceover(voiceover))),
        errors as unknown as ErrorFactory,
        {
          span: 'api.voiceovers.update',
          attributes: { 'voiceover.id': id },
        },
      );
    },
  ),

  delete: protectedProcedure.voiceovers.delete.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        deleteVoiceover({
          voiceoverId: input.id,
          userId: context.session.user.id,
        }).pipe(Effect.map(() => ({}))),
        errors as unknown as ErrorFactory,
        {
          span: 'api.voiceovers.delete',
          attributes: { 'voiceover.id': input.id },
        },
      );
    },
  ),

  generate: protectedProcedure.voiceovers.generate.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        startVoiceoverGeneration({
          voiceoverId: input.id,
          userId: context.session.user.id,
        }),
        errors as unknown as ErrorFactory,
        {
          span: 'api.voiceovers.generate',
          attributes: { 'voiceover.id': input.id },
        },
      );
    },
  ),

  getJob: protectedProcedure.voiceovers.getJob.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        getVoiceoverJob({ jobId: input.jobId }).pipe(Effect.map(serializeJob)),
        errors as unknown as ErrorFactory,
        {
          span: 'api.voiceovers.getJob',
          attributes: { 'job.id': input.jobId },
        },
      );
    },
  ),

  // =========================================================================
  // Collaborator Handlers
  // =========================================================================

  listCollaborators: protectedProcedure.voiceovers.listCollaborators.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listVoiceoverCollaborators({ voiceoverId: input.id }).pipe(
          Effect.map((result) =>
            [...result.collaborators].map(
              serializeVoiceoverCollaboratorWithUser,
            ),
          ),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.voiceovers.listCollaborators',
          attributes: { 'voiceover.id': input.id },
        },
      );
    },
  ),

  addCollaborator: protectedProcedure.voiceovers.addCollaborator.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        addVoiceoverCollaborator({
          voiceoverId: input.id,
          email: input.email,
          addedBy: context.session.user.id,
        }).pipe(
          Effect.map((result) =>
            serializeVoiceoverCollaboratorWithUser(result.collaborator),
          ),
        ),
        errors as unknown as ErrorFactory,
        {
          span: 'api.voiceovers.addCollaborator',
          attributes: {
            'voiceover.id': input.id,
            'collaborator.email': input.email,
          },
        },
      );
    },
  ),

  removeCollaborator: protectedProcedure.voiceovers.removeCollaborator.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        removeVoiceoverCollaborator({
          collaboratorId: input.collaboratorId as VoiceoverCollaboratorId,
          removedBy: context.session.user.id,
        }).pipe(Effect.map(() => ({}))),
        errors as unknown as ErrorFactory,
        {
          span: 'api.voiceovers.removeCollaborator',
          attributes: {
            'voiceover.id': input.id,
            'collaborator.id': input.collaboratorId,
          },
        },
      );
    },
  ),

  approve: protectedProcedure.voiceovers.approve.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        approveVoiceover({
          voiceoverId: input.id,
          userId: context.session.user.id,
        }).pipe(Effect.map((result) => ({ isOwner: result.isOwner }))),
        errors as unknown as ErrorFactory,
        {
          span: 'api.voiceovers.approve',
          attributes: { 'voiceover.id': input.id },
        },
      );
    },
  ),

  revokeApproval: protectedProcedure.voiceovers.revokeApproval.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        revokeVoiceoverApproval({
          voiceoverId: input.id,
          userId: context.session.user.id,
        }).pipe(Effect.map((result) => ({ isOwner: result.isOwner }))),
        errors as unknown as ErrorFactory,
        {
          span: 'api.voiceovers.revokeApproval',
          attributes: { 'voiceover.id': input.id },
        },
      );
    },
  ),

  claimInvites: protectedProcedure.voiceovers.claimInvites.handler(
    async ({ context, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        claimVoiceoverPendingInvites({
          email: context.session.user.email,
          userId: context.session.user.id,
        }),
        errors as unknown as ErrorFactory,
        {
          span: 'api.voiceovers.claimInvites',
          attributes: { 'user.id': context.session.user.id },
        },
      );
    },
  ),
};

export default voiceoverRouter;
