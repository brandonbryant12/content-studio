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
 * Configuration for Vertex AI TTS provider.
 *
 * Supports two authentication modes:
 * 1. Express Mode: Uses GOOGLE_VERTEX_API_KEY env var (simpler, good for dev)
 * 2. Service Account: Uses GOOGLE_APPLICATION_CREDENTIALS env var (production)
 */
export type VertexTTSConfig =
  | {
      /** Express mode - uses API key */
      readonly mode: 'express';
      /** Vertex AI API key */
      readonly apiKey: string;
      /** Default: 'gemini-2.5-flash-preview-tts' */
      readonly model?: string;
    }
  | {
      /** Service account mode - uses Application Default Credentials */
      readonly mode: 'serviceAccount';
      /** GCP project ID */
      readonly project: string;
      /** GCP region (e.g., 'us-central1') */
      readonly location: string;
      /** Default: 'gemini-2.5-flash-preview-tts' */
      readonly model?: string;
    };

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
 * Map Vertex API errors to domain errors.
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
 * Get access token for Vertex AI API.
 * Uses google-auth-library's Application Default Credentials.
 */
const getAccessToken = async (): Promise<string> => {
  // Dynamically import to avoid bundling issues
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new Error('Failed to obtain access token');
  }
  return token.token;
};

/**
 * Build the Vertex AI endpoint URL.
 */
const buildEndpoint = (
  project: string,
  location: string,
  model: string,
): string =>
  `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;

/**
 * Create Vertex TTS service implementation.
 */
const makeVertexTTSService = (config: VertexTTSConfig): TTSService => {
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
            'tts.provider': 'vertex',
            'tts.gender': options?.gender ?? 'all',
          },
        }),
      ),

    previewVoice: (options: PreviewVoiceOptions) =>
      Effect.tryPromise({
        try: async () => {
          const text = options.text ?? DEFAULT_PREVIEW_TEXT;

          // Use generateContent endpoint (same approach as Google provider)
          let headers: Record<string, string>;
          let url: string;

          if (config.mode === 'express') {
            url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
            headers = {
              'Content-Type': 'application/json',
              'x-goog-api-key': config.apiKey,
            };
          } else {
            const accessToken = await getAccessToken();
            url = buildEndpoint(config.project, config.location, modelName);
            headers = {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            };
          }

          const response = await fetch(url, {
            method: 'POST',
            headers,
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
          });

          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(
              `Vertex TTS API error: ${response.status} - ${errorBody}`,
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
            'tts.provider': 'vertex',
            'tts.model': modelName,
            'tts.voiceId': options.voiceId,
          },
        }),
      ),

    synthesize: (options: SynthesizeOptions) =>
      Effect.tryPromise({
        try: async () => {
          // Build conversation text in format "Speaker: text\nSpeaker2: text"
          const conversationText = options.turns
            .map((t) => `${t.speaker}: ${t.text}`)
            .join('\n');

          // Build auth headers and URL based on mode
          let headers: Record<string, string>;
          let url: string;

          if (config.mode === 'express') {
            // Express mode uses API key header
            url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
            headers = {
              'Content-Type': 'application/json',
              'x-goog-api-key': config.apiKey,
            };
          } else {
            // Service account mode uses OAuth Bearer token
            const accessToken = await getAccessToken();
            url = buildEndpoint(config.project, config.location, modelName);
            headers = {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            };
          }

          const response = await fetch(url, {
            method: 'POST',
            headers,
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
          });

          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(
              `Vertex TTS API error: ${response.status} - ${errorBody}`,
            );
          }

          // Vertex API returns audio in candidates[0].content.parts[0].inlineData
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

          // Log format info for debugging
          console.log('[TTS] Vertex response:', {
            mimeType: inlineData.mimeType,
            dataSize: audioData.length,
            first4Bytes: audioData.slice(0, 4).toString('hex'),
            headerCheck: audioData.slice(0, 4).toString('ascii'),
          });

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
            'tts.provider': 'vertex',
            'tts.model': modelName,
            'tts.turnCount': options.turns.length,
            'tts.speakerCount': options.voiceConfigs.length,
          },
        }),
      ),
  };
};

/**
 * Create Vertex AI TTS service layer.
 *
 * @example Express Mode (uses API key)
 * ```typescript
 * const TTSLive = VertexTTSLive({
 *   mode: 'express',
 *   apiKey: env.GOOGLE_VERTEX_API_KEY,
 * });
 * ```
 *
 * @example Service Account Mode (uses GOOGLE_APPLICATION_CREDENTIALS env var)
 * ```typescript
 * const TTSLive = VertexTTSLive({
 *   mode: 'serviceAccount',
 *   project: env.GOOGLE_VERTEX_PROJECT,
 *   location: env.GOOGLE_VERTEX_LOCATION,
 * });
 * ```
 */
export const VertexTTSLive = (config: VertexTTSConfig): Layer.Layer<TTS> =>
  Layer.succeed(TTS, makeVertexTTSService(config));
