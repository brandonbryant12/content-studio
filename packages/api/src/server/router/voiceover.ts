import {
  serializeVoiceoverEffect,
  serializeVoiceoverListItemsEffect,
  serializeJobEffect,
} from '@repo/db/schema';
import {
  listVoiceovers,
  getVoiceover,
  createVoiceover,
  updateVoiceover,
  deleteVoiceover,
  startVoiceoverGeneration,
  getVoiceoverJob,
  approveVoiceover,
  revokeVoiceoverApproval,
} from '@repo/media';
import { Effect } from 'effect';
import { handleEffectWithProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import { tapLogActivity, tapSyncTitle } from './log-activity';

const voiceoverRouter = {
  list: protectedProcedure.voiceovers.list.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        listVoiceovers(input).pipe(
          Effect.flatMap((result) =>
            serializeVoiceoverListItemsEffect([...result.voiceovers]),
          ),
        ),
        errors,
        {
          requestId: context.requestId,
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
          Effect.flatMap(serializeVoiceoverEffect),
        ),
        errors,
        {
          requestId: context.requestId,
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
        createVoiceover(input).pipe(
          Effect.flatMap(serializeVoiceoverEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'voiceover'),
        ),
        errors,
        {
          requestId: context.requestId,
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
          data,
        }).pipe(
          Effect.flatMap(serializeVoiceoverEffect),
          tapSyncTitle(context.runtime, context.user),
        ),
        errors,
        {
          requestId: context.requestId,
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
        }).pipe(
          Effect.map(() => ({})),
          tapLogActivity(
            context.runtime,
            context.user,
            'deleted',
            'voiceover',
            input.id,
          ),
        ),
        errors,
        {
          requestId: context.requestId,
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
        }),
        errors,
        {
          requestId: context.requestId,
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
        getVoiceoverJob({ jobId: input.jobId }).pipe(
          Effect.flatMap(serializeJobEffect),
        ),
        errors,
        {
          requestId: context.requestId,
          attributes: { 'job.id': input.jobId },
        },
      );
    },
  ),

  approve: protectedProcedure.voiceovers.approve.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        approveVoiceover({ voiceoverId: input.id }).pipe(
          Effect.flatMap((result) =>
            serializeVoiceoverEffect(result.voiceover),
          ),
        ),
        errors,
        {
          requestId: context.requestId,
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
        revokeVoiceoverApproval({ voiceoverId: input.id }).pipe(
          Effect.flatMap((result) =>
            serializeVoiceoverEffect(result.voiceover),
          ),
        ),
        errors,
        {
          requestId: context.requestId,
          attributes: { 'voiceover.id': input.id },
        },
      );
    },
  ),
};

export default voiceoverRouter;
