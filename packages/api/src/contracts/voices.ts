import { oc } from '@orpc/contract';
import { Schema } from 'effect';

// Helper to convert Effect Schema to Standard Schema for oRPC
const std = Schema.standardSchemaV1;

const GenderSchema = Schema.Union(
  Schema.Literal('female'),
  Schema.Literal('male'),
);

const VoiceInfoSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  gender: GenderSchema,
  description: Schema.String,
});

const AudioEncodingSchema = Schema.Union(
  Schema.Literal('MP3'),
  Schema.Literal('LINEAR16'),
  Schema.Literal('OGG_OPUS'),
);

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
        description:
          'Retrieve all available TTS voices, optionally filtered by gender',
      })
      .input(
        std(
          Schema.Struct({
            gender: Schema.optional(GenderSchema),
          }),
        ),
      )
      .output(std(Schema.Array(VoiceInfoSchema))),

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
          data: std(
            Schema.Struct({
              voiceId: Schema.String,
            }),
          ),
        },
      })
      .input(
        std(
          Schema.Struct({
            voiceId: Schema.String,
            text: Schema.optional(Schema.String.pipe(Schema.maxLength(500))),
            audioEncoding: Schema.optional(AudioEncodingSchema),
          }),
        ),
      )
      .output(
        std(
          Schema.Struct({
            audioContent: Schema.String, // Base64 encoded audio
            audioEncoding: AudioEncodingSchema,
            voiceId: Schema.String,
          }),
        ),
      ),
  });

export default voicesContract;
