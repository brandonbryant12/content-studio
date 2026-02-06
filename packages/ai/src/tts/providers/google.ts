import { TTSError, TTSQuotaExceededError } from '../../errors';
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
import { VOICES, getVoicesByGender, DEFAULT_PREVIEW_TEXT } from '../voices';

/**
 * Configuration for Google Gemini TTS provider.
 */
export interface GoogleTTSConfig {
  /** Gemini API key - required, should be passed from validated env.GEMINI_API_KEY */
  readonly apiKey: string;
  /** Default: 'gemini-2.5-flash-preview-tts' */
  readonly model?: string;
}

/**
 * Wrap raw PCM data in a WAV container.
 * Gemini TTS returns raw PCM: 24kHz, 16-bit, mono
 */
const wrapPcmAsWav = (pcmData: Buffer): Buffer => {
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const headerSize = 44;

  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4); // file size - 8
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, 44);

  return buffer;
};

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
  const apiKey = config.apiKey;
  const modelName = config.model ?? 'gemini-2.5-flash-preview-tts';

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

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [{ text }],
                  },
                ],
                generationConfig: {
                  responseModalities: ['AUDIO'],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: {
                        voiceName: options.voiceId,
                      },
                    },
                  },
                },
              }),
            },
          );

          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(
              `Google TTS API error: ${response.status} - ${errorBody}`,
            );
          }

          const data = (await response.json()) as {
            candidates: Array<{
              content: {
                parts: Array<{
                  inlineData?: { mimeType: string; data: string };
                }>;
              };
            }>;
          };

          const inlineData =
            data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (!inlineData?.data) {
            throw new Error('No audio data in response');
          }

          const audioData = Buffer.from(inlineData.data, 'base64');
          const isAlreadyWav =
            audioData.slice(0, 4).toString('ascii') === 'RIFF';
          const audioContent = isAlreadyWav
            ? audioData
            : wrapPcmAsWav(audioData);

          return {
            audioContent,
            audioEncoding: 'LINEAR16' as AudioEncoding,
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

          // Build conversation text in format "Speaker: text\nSpeaker2: text"
          const conversationText = options.turns
            .map((t) => `${t.speaker}: ${t.text}`)
            .join('\n');

          // Use Gemini API endpoint for multi-speaker synthesis
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [{ text: conversationText }],
                  },
                ],
                generationConfig: {
                  responseModalities: ['AUDIO'],
                  speechConfig: {
                    multiSpeakerVoiceConfig: {
                      speakerVoiceConfigs: options.voiceConfigs.map((vc) => ({
                        speaker: vc.speakerAlias,
                        voiceConfig: {
                          prebuiltVoiceConfig: {
                            voiceName: vc.voiceId,
                          },
                        },
                      })),
                    },
                  },
                },
              }),
            },
          );

          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(
              `Google TTS API error: ${response.status} - ${errorBody}`,
            );
          }

          // Gemini API returns audio in candidates[0].content.parts[0].inlineData
          const data = (await response.json()) as {
            candidates: Array<{
              content: {
                parts: Array<{
                  inlineData?: { mimeType: string; data: string };
                }>;
              };
            }>;
          };

          const inlineData =
            data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (!inlineData?.data) {
            throw new Error('No audio data in response');
          }

          // Decode base64 audio data
          const audioData = Buffer.from(inlineData.data, 'base64');

          // Check if already WAV (starts with RIFF header) - don't double-wrap
          const isAlreadyWav =
            audioData.slice(0, 4).toString('ascii') === 'RIFF';
          const audioContent = isAlreadyWav
            ? audioData
            : wrapPcmAsWav(audioData);

          return {
            audioContent,
            audioEncoding: 'LINEAR16', // WAV format
            mimeType: 'audio/wav',
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
 * const TTSLive = GoogleTTSLive({ apiKey: 'your-api-key' });
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
export const GoogleTTSLive = (config: GoogleTTSConfig): Layer.Layer<TTS> =>
  Layer.succeed(TTS, makeGoogleTTSService(config));
