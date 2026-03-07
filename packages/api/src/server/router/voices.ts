import { listVoicesWithPreviews, previewVoice } from '@repo/ai/tts';
import { Effect } from 'effect';
import { bindEffectProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';

const voicesRouter = {
  list: protectedProcedure.voices.list.handler(async ({ context, errors }) => {
    return bindEffectProtocol({ context, errors }).run(
      listVoicesWithPreviews({}),
    );
  }),

  preview: protectedProcedure.voices.preview.handler(
    async ({ context, input, errors }) =>
      bindEffectProtocol({ context, errors }).run(
        previewVoice(input).pipe(
          Effect.map((result) => ({
            audioContent: result.audioContent.toString('base64'),
            audioEncoding: result.audioEncoding,
            voiceId: result.voiceId,
          })),
        ),
        {
          attributes: { 'voice.id': input.voiceId },
        },
      ),
  ),
};

export default voicesRouter;
