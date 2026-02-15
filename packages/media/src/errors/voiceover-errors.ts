import { Schema } from 'effect';

export class VoiceoverNotFound extends Schema.TaggedError<VoiceoverNotFound>()(
  'VoiceoverNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'VOICEOVER_NOT_FOUND' as const;
  static readonly httpMessage = (e: VoiceoverNotFound) =>
    e.message ?? `Voiceover ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: VoiceoverNotFound) {
    return { voiceoverId: e.id };
  }
}

export class VoiceoverError extends Schema.TaggedError<VoiceoverError>()(
  'VoiceoverError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Voiceover operation failed';
  static readonly logLevel = 'error-with-stack' as const;
}

export class InvalidVoiceoverAudioGeneration extends Schema.TaggedError<InvalidVoiceoverAudioGeneration>()(
  'InvalidVoiceoverAudioGeneration',
  {
    voiceoverId: Schema.String,
    reason: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 400 as const;
  static readonly httpCode = 'INVALID_VOICEOVER_AUDIO_GENERATION' as const;
  static readonly httpMessage = (e: InvalidVoiceoverAudioGeneration) =>
    e.message ?? e.reason;
  static readonly logLevel = 'silent' as const;
  static getData(e: InvalidVoiceoverAudioGeneration) {
    return { voiceoverId: e.voiceoverId, reason: e.reason };
  }
}
