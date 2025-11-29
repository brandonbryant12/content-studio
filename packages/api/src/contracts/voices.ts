import { oc } from '@orpc/contract';
import * as v from 'valibot';

const genderSchema = v.picklist(['female', 'male']);

const voiceInfoSchema = v.object({
  id: v.string(),
  name: v.string(),
  gender: genderSchema,
  description: v.string(),
});

const audioEncodingSchema = v.picklist(['MP3', 'LINEAR16', 'OGG_OPUS']);

const voicesContract = oc
  .prefix('/voices')
  .tag('voices')
  .router({
    // List all available voices
    list: oc
      .route({
        method: 'GET',
        path: '/',
        summary: 'List voices',
        description: 'Retrieve all available TTS voices, optionally filtered by gender',
      })
      .input(
        v.object({
          gender: v.optional(genderSchema),
        }),
      )
      .output(v.array(voiceInfoSchema)),

    // Preview a voice
    preview: oc
      .route({
        method: 'POST',
        path: '/{voiceId}/preview',
        summary: 'Preview voice',
        description: 'Generate a short audio preview of a voice',
      })
      .errors({
        VOICE_NOT_FOUND: {
          status: 404,
          data: v.object({
            voiceId: v.string(),
          }),
        },
      })
      .input(
        v.object({
          voiceId: v.string(),
          text: v.optional(v.pipe(v.string(), v.maxLength(500))),
          audioEncoding: v.optional(audioEncodingSchema),
        }),
      )
      .output(
        v.object({
          audioContent: v.string(), // Base64 encoded audio
          audioEncoding: audioEncodingSchema,
          voiceId: v.string(),
        }),
      ),
  });

export default voicesContract;
