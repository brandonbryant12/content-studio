import { Effect, Layer } from 'effect';
import type { JsonValue } from '@repo/db/schema';
import { VoiceNotFoundError } from '../../errors';
import {
  GoogleApiError,
  parseGoogleApiErrorBody,
} from '../../google/error-parser';
import { estimateTokenPricedModelCostUsdMicros } from '../../pricing/model-catalog';
import { retryTransientProvider } from '../../provider-retry';
import { PROVIDER_TIMEOUTS_MS } from '../../provider-timeouts';
import {
  getGoogleTTSModel,
  type GoogleTTSModelId,
  TTS_MODEL,
} from '../../providers/google/models';
import { recordAIUsageIfConfigured } from '../../usage';
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
import {
  DEFAULT_PREVIEW_TEXT,
  getVoiceById,
  getVoicesByGender,
  VOICES,
} from '../voices';

/**
 * Configuration for Google Gemini TTS provider.
 */
export interface GoogleTTSConfig {
  /** Gemini API key - required, should be passed from validated env.GEMINI_API_KEY */
  readonly apiKey: string;
  /** Override the default TTS model from models.ts */
  readonly model?: GoogleTTSModelId;
}

/** Typed shape of the Gemini TTS generateContent response. */
interface GeminiTTSResponse {
  responseId?: string;
  usageMetadata?: Record<string, unknown>;
  candidates: Array<{
    content: {
      parts: Array<{ inlineData?: { mimeType: string; data: string } }>;
    };
  }>;
}

const getNumberField = (
  value: Record<string, unknown> | undefined,
  field: string,
): number | undefined => {
  const maybeValue = value?.[field];
  return typeof maybeValue === 'number' ? maybeValue : undefined;
};

const compactJsonRecord = (
  record: Record<string, JsonValue | undefined>,
): Record<string, JsonValue> =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as Record<string, JsonValue>;

const buildTTSUsage = (input: {
  readonly textChars: number;
  readonly audioBytes: number;
  readonly usageMetadata?: Record<string, unknown>;
}) =>
  compactJsonRecord({
    inputChars: input.textChars,
    outputAudioBytes: input.audioBytes,
    promptTokens: getNumberField(input.usageMetadata, 'promptTokenCount'),
    outputTokens: getNumberField(input.usageMetadata, 'candidatesTokenCount'),
    totalTokens: getNumberField(input.usageMetadata, 'totalTokenCount'),
    thoughtsTokens: getNumberField(input.usageMetadata, 'thoughtsTokenCount'),
    cachedInputTokens: getNumberField(
      input.usageMetadata,
      'cachedContentTokenCount',
    ),
  });

const toBillableTokenUsage = (usageMetadata?: Record<string, unknown>) => ({
  inputTokens: getNumberField(usageMetadata, 'promptTokenCount'),
  outputTokens: getNumberField(usageMetadata, 'candidatesTokenCount'),
});

const ensureKnownVoice = (voiceId: string) => {
  const voice = getVoiceById(voiceId);
  return voice
    ? Effect.succeed(voice)
    : Effect.fail(new VoiceNotFoundError({ voiceId }));
};

const ensureKnownVoices = (voiceConfigs: SynthesizeOptions['voiceConfigs']) =>
  Effect.forEach(voiceConfigs, (voiceConfig) =>
    ensureKnownVoice(voiceConfig.voiceId),
  );

/** Call the Gemini generateContent endpoint and return the raw response. */
async function callGeminiTTS(
  apiKey: string,
  modelName: string,
  body: Record<string, unknown>,
): Promise<GeminiTTSResponse> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      // Per-attempt timeout budget: retries call this function again.
      signal: AbortSignal.timeout(PROVIDER_TIMEOUTS_MS.ttsGenerate),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    const details = parseGoogleApiErrorBody(errorBody);

    throw new GoogleApiError('Google TTS API error', {
      statusCode: response.status,
      statusText: response.statusText,
      retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined,
      body: errorBody,
      details: details ?? undefined,
    });
  }

  return (await response.json()) as GeminiTTSResponse;
}

/** Extract audio buffer from a Gemini TTS response, wrapping raw PCM as WAV if needed. */
function extractAudio(data: GeminiTTSResponse): Buffer {
  const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inlineData?.data) {
    const preview = JSON.stringify(data).slice(0, 500);
    throw new Error(`No audio data in response: ${preview}`);
  }

  const audioData = Buffer.from(inlineData.data, 'base64');
  const isAlreadyWav = audioData.slice(0, 4).toString('ascii') === 'RIFF';
  return isAlreadyWav ? audioData : wrapPcmAsWav(audioData);
}

/**
 * Create Google TTS service implementation.
 */
const makeGoogleTTSService = (config: GoogleTTSConfig): TTSService => {
  const modelName = config.model ?? TTS_MODEL;
  const modelDefinition = getGoogleTTSModel(modelName);

  return {
    listVoices: (options?: ListVoicesOptions) =>
      Effect.succeed(
        options?.gender ? getVoicesByGender(options.gender) : VOICES,
      ).pipe(
        Effect.withSpan('tts.listVoices', {
          attributes: {
            'tts.provider': 'google',
            'tts.gender': options?.gender ?? 'all',
          },
        }),
      ),

    previewVoice: (options: PreviewVoiceOptions) =>
      Effect.gen(function* () {
        yield* ensureKnownVoice(options.voiceId);
        const text = options.text ?? DEFAULT_PREVIEW_TEXT;
        const metadata = compactJsonRecord({
          voiceId: options.voiceId,
          textChars: text.length,
        });

        return yield* Effect.tryPromise({
          try: async () => {
            const response = await callGeminiTTS(config.apiKey, modelName, {
              contents: [{ parts: [{ text }] }],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: options.voiceId },
                  },
                },
              },
            });

            const audioContent = extractAudio(response);

            return {
              response,
              result: {
                audioContent,
                audioEncoding: 'LINEAR16',
                voiceId: options.voiceId,
              } satisfies PreviewVoiceResult,
            };
          },
          catch: mapError,
        }).pipe(
          Effect.tap(({ response, result }) =>
            recordAIUsageIfConfigured({
              modality: 'tts',
              provider: 'google',
              providerOperation: 'previewVoice',
              model: modelName,
              status: 'succeeded',
              providerResponseId: response.responseId ?? null,
              usage: buildTTSUsage({
                textChars: text.length,
                audioBytes: result.audioContent.length,
                usageMetadata: response.usageMetadata,
              }),
              metadata,
              rawUsage: response.usageMetadata ?? null,
              estimatedCostUsdMicros: estimateTokenPricedModelCostUsdMicros(
                modelDefinition,
                toBillableTokenUsage(response.usageMetadata),
              ),
            }),
          ),
          Effect.tapError((error) =>
            recordAIUsageIfConfigured({
              modality: 'tts',
              provider: 'google',
              providerOperation: 'previewVoice',
              model: modelName,
              status: 'failed',
              errorTag: error._tag,
              metadata,
            }),
          ),
          Effect.map(({ result }) => result),
        );
      }).pipe(
        retryTransientProvider,
        Effect.withSpan('tts.previewVoice', {
          attributes: {
            'tts.provider': 'google',
            'tts.model': modelName,
            'tts.voiceId': options.voiceId,
          },
        }),
      ),

    synthesize: (options: SynthesizeOptions) =>
      Effect.gen(function* () {
        yield* ensureKnownVoices(options.voiceConfigs);
        const isSingleSpeaker = options.voiceConfigs.length === 1;
        const contentText = isSingleSpeaker
          ? options.turns.map((turn) => turn.text).join('\n')
          : options.turns
              .map((turn) => `${turn.speaker}: ${turn.text}`)
              .join('\n');

        const speechConfig = isSingleSpeaker
          ? {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: options.voiceConfigs[0]!.voiceId,
                },
              },
            }
          : {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: options.voiceConfigs.map(
                  (voiceConfig) => ({
                    speaker: voiceConfig.speakerAlias,
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: voiceConfig.voiceId },
                    },
                  }),
                ),
              },
            };

        const metadata = compactJsonRecord({
          textChars: contentText.length,
          turnCount: options.turns.length,
          speakerCount: options.voiceConfigs.length,
          voiceIds: options.voiceConfigs.map(
            (voiceConfig) => voiceConfig.voiceId,
          ),
        });

        return yield* Effect.tryPromise({
          try: async () => {
            const response = await callGeminiTTS(config.apiKey, modelName, {
              contents: [{ parts: [{ text: contentText }] }],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig,
              },
            });

            const audioContent = extractAudio(response);

            return {
              response,
              result: {
                audioContent,
                audioEncoding: 'LINEAR16',
                mimeType: 'audio/wav',
              } satisfies SynthesizeResult,
            };
          },
          catch: mapError,
        }).pipe(
          Effect.tap(({ response, result }) =>
            recordAIUsageIfConfigured({
              modality: 'tts',
              provider: 'google',
              providerOperation: 'synthesize',
              model: modelName,
              status: 'succeeded',
              providerResponseId: response.responseId ?? null,
              usage: buildTTSUsage({
                textChars: contentText.length,
                audioBytes: result.audioContent.length,
                usageMetadata: response.usageMetadata,
              }),
              metadata,
              rawUsage: response.usageMetadata ?? null,
              estimatedCostUsdMicros: estimateTokenPricedModelCostUsdMicros(
                modelDefinition,
                toBillableTokenUsage(response.usageMetadata),
              ),
            }),
          ),
          Effect.tapError((error) =>
            recordAIUsageIfConfigured({
              modality: 'tts',
              provider: 'google',
              providerOperation: 'synthesize',
              model: modelName,
              status: 'failed',
              errorTag: error._tag,
              metadata,
            }),
          ),
          Effect.map(({ result }) => result),
        );
      }).pipe(
        retryTransientProvider,
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
  Layer.sync(TTS, () => makeGoogleTTSService(config));
