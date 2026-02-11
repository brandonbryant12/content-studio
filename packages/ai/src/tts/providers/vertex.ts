import { Effect, Layer } from 'effect';
import { wrapPcmAsWav } from '../audio-utils';
import { mapError } from '../map-error';
import {
  TTS,
  type TTSService,
  type SynthesizeOptions,
  type SynthesizeResult,
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
            const preview = JSON.stringify(data).slice(0, 500);
            throw new Error(`No audio data in response: ${preview}`);
          }

          const audioData = Buffer.from(inlineData.data, 'base64');
          const isAlreadyWav =
            audioData.slice(0, 4).toString('ascii') === 'RIFF';
          const audioContent = isAlreadyWav
            ? audioData
            : wrapPcmAsWav(audioData);

          return {
            audioContent,
            audioEncoding: 'LINEAR16',
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
          // Single-speaker: plain text; multi-speaker: "Speaker: text" format
          const isSingleSpeaker = options.voiceConfigs.length === 1;
          const contentText = isSingleSpeaker
            ? options.turns.map((t) => t.text).join('\n')
            : options.turns.map((t) => `${t.speaker}: ${t.text}`).join('\n');

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
                  parts: [{ text: contentText }],
                },
              ],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: isSingleSpeaker
                  ? {
                      voiceConfig: {
                        prebuiltVoiceConfig: {
                          voiceName: options.voiceConfigs[0]!.voiceId,
                        },
                      },
                    }
                  : {
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
            const preview = JSON.stringify(data).slice(0, 500);
            throw new Error(`No audio data in response: ${preview}`);
          }

          const audioData = Buffer.from(inlineData.data, 'base64');

          // Don't double-wrap: check if response is already WAV (RIFF header)
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
