import { listVoicesWithPreviews, previewVoice } from '@repo/ai/tts';
import { Effect } from 'effect';
import { handleEffectWithProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';

const voicesRouter = {
  list: protectedProcedure.voices.list.handler(async ({ context, errors }) => {
    return handleEffectWithProtocol(
      context.runtime,
      context.user,
      listVoicesWithPreviews({}),
      errors,
      { span: 'api.voices.list' },
    );
  }),

  preview: protectedProcedure.voices.preview.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        previewVoice(input).pipe(
          Effect.map((result) => ({
            audioContent: result.audioContent.toString('base64'),
            audioEncoding: result.audioEncoding,
            voiceId: result.voiceId,
          })),
        ),
        errors,
        {
          span: 'api.voices.preview',
          attributes: { 'voice.id': input.voiceId },
        },
      );
    },
  ),
};

export default voicesRouter;
