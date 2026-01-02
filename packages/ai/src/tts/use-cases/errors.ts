import { Schema } from 'effect';

/**
 * Voice not found.
 * Thrown when an invalid voice ID is provided.
 */
export class VoiceNotFoundError extends Schema.TaggedError<VoiceNotFoundError>()(
  'VoiceNotFoundError',
  {
    voiceId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'VOICE_NOT_FOUND' as const;
  static readonly httpMessage = (e: VoiceNotFoundError) =>
    e.message || `Voice "${e.voiceId}" not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: VoiceNotFoundError) {
    return { voiceId: e.voiceId };
  }
}
