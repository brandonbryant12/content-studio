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
} from '@repo/media/voiceover';
import { Effect } from 'effect';
import { bindEffectProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';
import { tapLogActivity, tapSyncTitle } from './_shared/entity-activity';

const voiceoverRouter = {
  list: protectedProcedure.voiceovers.list.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        listVoiceovers(input).pipe(
          Effect.flatMap((result) =>
            serializeVoiceoverListItemsEffect([...result.voiceovers]),
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

  get: protectedProcedure.voiceovers.get.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        getVoiceover({ voiceoverId: input.id, userId: input.userId }).pipe(
          Effect.flatMap(serializeVoiceoverEffect),
        ),
        {
          attributes: { 'voiceover.id': input.id },
        },
      ),
  ),

  create: protectedProcedure.voiceovers.create.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        createVoiceover(input).pipe(
          Effect.flatMap(serializeVoiceoverEffect),
          tapLogActivity(context.runtime, context.user, 'created', 'voiceover'),
        ),
        {
          attributes: { 'voiceover.title': input.title },
        },
      ),
  ),

  update: protectedProcedure.voiceovers.update.handler(
    async ({ context, input, errors }) => {
      const { id, ...data } = input;

      return bindEffectProtocol({ context, errors }).run(
        updateVoiceover({
          voiceoverId: id,
          data,
        }).pipe(
          Effect.flatMap(serializeVoiceoverEffect),
          tapSyncTitle(context.runtime, context.user),
        ),
        {
          attributes: { 'voiceover.id': id },
        },
      );
    },
  ),

  delete: protectedProcedure.voiceovers.delete.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        deleteVoiceover({
          voiceoverId: input.id,
        }).pipe(
          Effect.as({}),
          tapLogActivity(
            context.runtime,
            context.user,
            'deleted',
            'voiceover',
            input.id,
          ),
        ),
        {
          attributes: { 'voiceover.id': input.id },
        },
      ),
  ),

  generate: protectedProcedure.voiceovers.generate.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        startVoiceoverGeneration({
          voiceoverId: input.id,
        }),
        {
          attributes: { 'voiceover.id': input.id },
        },
      ),
  ),

  getJob: protectedProcedure.voiceovers.getJob.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        getVoiceoverJob({ jobId: input.jobId }).pipe(
          Effect.flatMap(serializeJobEffect),
        ),
        {
          attributes: { 'job.id': input.jobId },
        },
      ),
  ),

  approve: protectedProcedure.voiceovers.approve.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        approveVoiceover({ voiceoverId: input.id }).pipe(
          Effect.flatMap((result) =>
            serializeVoiceoverEffect(result.voiceover),
          ),
        ),
        {
          attributes: { 'voiceover.id': input.id },
        },
      ),
  ),

  revokeApproval: protectedProcedure.voiceovers.revokeApproval.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        revokeVoiceoverApproval({ voiceoverId: input.id }).pipe(
          Effect.flatMap((result) =>
            serializeVoiceoverEffect(result.voiceover),
          ),
        ),
        {
          attributes: { 'voiceover.id': input.id },
        },
      ),
  ),
};

export default voiceoverRouter;
