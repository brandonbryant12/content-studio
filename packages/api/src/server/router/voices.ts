import {
  TTS,
  isValidVoiceId,
  type GeminiVoiceId,
  type AudioEncoding,
} from '@repo/ai/tts';
import { Effect } from 'effect';
import { createErrorHandlers, handleEffect } from '../effect-handler';
import { protectedProcedure } from '../orpc';

interface PreviewResult {
  audioContent: string;
  audioEncoding: AudioEncoding;
  voiceId: string;
}

const voicesRouter = {
  list: protectedProcedure.voices.list.handler(async ({ context, errors }) => {
    const handlers = createErrorHandlers(errors);
    return handleEffect(
      Effect.gen(function* () {
        const tts = yield* TTS;
        const voices = yield* tts.listVoices({});
        return [...voices];
      }).pipe(Effect.withSpan('api.voices.list'), Effect.provide(context.layers)),
      {
        ...handlers.tts,
      },
    );
  }),

  preview: protectedProcedure.voices.preview.handler(
    async ({ context, input, errors }) => {
      const handlers = createErrorHandlers(errors);

      // Validate voice ID
      if (!isValidVoiceId(input.voiceId)) {
        throw errors.VOICE_NOT_FOUND({
          message: `Voice "${input.voiceId}" not found`,
          data: { voiceId: input.voiceId },
        });
      }

      return handleEffect(
        Effect.gen(function* () {
          const tts = yield* TTS;
          const result = yield* tts.previewVoice({
            voiceId: input.voiceId as GeminiVoiceId,
            text: input.text,
            audioEncoding: input.audioEncoding,
          });

          return {
            audioContent: result.audioContent.toString('base64'),
            audioEncoding: result.audioEncoding,
            voiceId: result.voiceId,
          } satisfies PreviewResult;
        }).pipe(
          Effect.withSpan('api.voices.preview', {
            attributes: { 'voices.voiceId': input.voiceId },
          }),
          Effect.provide(context.layers),
        ),
        {
          ...handlers.tts,
        },
      );
    },
  ),
};

export default voicesRouter;
