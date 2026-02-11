import { listVoices, previewVoice, type AudioEncoding } from '@repo/ai/tts';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import { handleEffectWithProtocol } from '../effect-handler';
import { protectedProcedure } from '../orpc';

interface PreviewResult {
  audioContent: string;
  audioEncoding: AudioEncoding;
  voiceId: string;
}

const resolvePreviewUrl = (voiceId: string) =>
  Effect.gen(function* () {
    const storage = yield* Storage;
    const key = `voice-previews/${voiceId}.wav`;
    const exists = yield* storage.exists(key);
    if (!exists) return null;
    return yield* storage.getUrl(key);
  }).pipe(Effect.catchAll(() => Effect.succeed(null)));

const voicesRouter = {
  list: protectedProcedure.voices.list.handler(async ({ context, errors }) => {
    return handleEffectWithProtocol(
      context.runtime,
      context.user,
      listVoices({}).pipe(
        Effect.flatMap((result) =>
          Effect.all(
            result.voices.map((voice) =>
              resolvePreviewUrl(voice.id).pipe(
                Effect.map((previewUrl) => ({ ...voice, previewUrl })),
              ),
            ),
            { concurrency: 'unbounded' },
          ),
        ),
      ),
      errors,
      { span: 'api.voices.list' },
    );
  }),

  preview: protectedProcedure.voices.preview.handler(
    async ({ context, input, errors }) => {
      return handleEffectWithProtocol(
        context.runtime,
        context.user,
        previewVoice({
          voiceId: input.voiceId,
          text: input.text,
          audioEncoding: input.audioEncoding,
        }).pipe(
          Effect.map(
            (result): PreviewResult => ({
              audioContent: result.audioContent.toString('base64'),
              audioEncoding: result.audioEncoding,
              voiceId: result.voiceId,
            }),
          ),
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
