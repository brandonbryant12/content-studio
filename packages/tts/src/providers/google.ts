import { TTSError, TTSQuotaExceededError } from '@repo/effect/errors';
import { Effect, Layer } from 'effect';
import {
  TTS,
  type TTSService,
  type SynthesizeOptions,
  type SynthesizeResult,
  type AudioEncoding,
  type ListVoicesOptions,
  type PreviewVoiceOptions,
  type PreviewVoiceResult,
} from '../service';
import {
  VOICES,
  getVoicesByGender,
  DEFAULT_PREVIEW_TEXT,
  type VoiceInfo,
} from '../voices';

/**
 * Configuration for Google Gemini TTS provider.
 */
export interface GoogleTTSConfig {
  /** Google Cloud API key or uses GOOGLE_API_KEY env var */
  readonly apiKey?: string;
  /** Default: 'gemini-2.5-flash-tts' */
  readonly model?: string;
}

/**
 * Map Google API errors to domain errors.
 */
const mapError = (error: unknown): TTSError | TTSQuotaExceededError => {
  if (error instanceof Error) {
    if (error.message.includes('quota') || error.message.includes('429')) {
      return new TTSQuotaExceededError({
        message: error.message,
      });
    }

    return new TTSError({
      message: error.message,
      cause: error,
    });
  }

  return new TTSError({
    message: 'Unknown TTS error',
    cause: error,
  });
};

/**
 * Create Google TTS service implementation.
 */
const makeGoogleTTSService = (config: GoogleTTSConfig): TTSService => {
  const apiKey = config.apiKey ?? process.env.GOOGLE_API_KEY;
  const modelName = config.model ?? 'gemini-2.5-flash-tts';

  if (!apiKey) {
    throw new Error('Google API key is required. Set GOOGLE_API_KEY or pass apiKey in config.');
  }

  return {
    listVoices: (options?: ListVoicesOptions) =>
      Effect.sync(() => {
        if (options?.gender) {
          return getVoicesByGender(options.gender);
        }
        return VOICES;
      }).pipe(
        Effect.withSpan('tts.listVoices', {
          attributes: {
            'tts.provider': 'google',
            'tts.gender': options?.gender ?? 'all',
          },
        }),
      ),

    previewVoice: (options: PreviewVoiceOptions) =>
      Effect.tryPromise({
        try: async () => {
          const text = options.text ?? DEFAULT_PREVIEW_TEXT;
          const audioEncoding: AudioEncoding = options.audioEncoding ?? 'MP3';

          const response = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                input: { text },
                voice: {
                  languageCode: 'en-US',
                  name: `en-US-${modelName}-${options.voiceId}`,
                },
                audioConfig: {
                  audioEncoding,
                },
              }),
            },
          );

          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Google TTS API error: ${response.status} - ${errorBody}`);
          }

          const data = (await response.json()) as { audioContent: string };
          const audioContent = Buffer.from(data.audioContent, 'base64');

          return {
            audioContent,
            audioEncoding,
            voiceId: options.voiceId,
          } satisfies PreviewVoiceResult;
        },
        catch: mapError,
      }).pipe(
        Effect.withSpan('tts.previewVoice', {
          attributes: {
            'tts.provider': 'google',
            'tts.model': modelName,
            'tts.voiceId': options.voiceId,
          },
        }),
      ),

    synthesize: (options: SynthesizeOptions) =>
      Effect.tryPromise({
        try: async () => {
          const audioEncoding: AudioEncoding = options.audioEncoding ?? 'MP3';
          const languageCode = options.languageCode ?? 'en-US';

          const response = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                input: {
                  multiSpeakerMarkup: {
                    turns: options.turns.map((t) => ({
                      speaker: t.speaker,
                      text: t.text,
                    })),
                  },
                },
                voice: {
                  languageCode,
                  model: modelName,
                },
                multiSpeakerVoiceConfig: {
                  speakerVoiceConfigs: options.voiceConfigs.map((vc) => ({
                    speaker: vc.speakerAlias,
                    voiceName: vc.voiceId,
                  })),
                },
                audioConfig: {
                  audioEncoding,
                },
              }),
            },
          );

          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Google TTS API error: ${response.status} - ${errorBody}`);
          }

          const data = (await response.json()) as { audioContent: string };
          const audioContent = Buffer.from(data.audioContent, 'base64');

          return {
            audioContent,
            audioEncoding,
          } satisfies SynthesizeResult;
        },
        catch: mapError,
      }).pipe(
        Effect.withSpan('tts.synthesize', {
          attributes: {
            'tts.provider': 'google',
            'tts.model': modelName,
            'tts.turnCount': options.turns.length,
            'tts.speakerCount': options.voiceConfigs.length,
          },
        }),
      ),
  };
};

/**
 * Create Google TTS service layer.
 *
 * @example
 * ```typescript
 * const TTSLive = GoogleTTSLive({ model: 'gemini-2.5-flash-tts' });
 *
 * const program = Effect.gen(function* () {
 *   const tts = yield* TTS;
 *   const result = yield* tts.synthesize({
 *     turns: [
 *       { speaker: 'host', text: 'Welcome to the show!' },
 *       { speaker: 'guest', text: 'Thanks for having me!' },
 *     ],
 *     voiceConfigs: [
 *       { speakerAlias: 'host', voiceId: 'Charon' },
 *       { speakerAlias: 'guest', voiceId: 'Kore' },
 *     ],
 *   });
 *   return result.audioContent;
 * }).pipe(Effect.provide(TTSLive));
 * ```
 */
export const GoogleTTSLive = (config: GoogleTTSConfig = {}): Layer.Layer<TTS> =>
  Layer.succeed(TTS, makeGoogleTTSService(config));
