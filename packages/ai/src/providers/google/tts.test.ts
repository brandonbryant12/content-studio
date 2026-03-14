import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VoiceNotFoundError } from '../../errors';
import type { PersistAIUsageInput } from '../../usage/types';
import { TTS } from '../../tts/service';
import { AIUsageRecorder } from '../../usage/recorder';
import { withAIUsageScope } from '../../usage/scope';
import { GoogleTTSLive } from './tts';

vi.mock('../retry', () => ({
  retryTransientProvider: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E, R> => effect,
}));

const fetchMock = vi.hoisted(() => vi.fn());

const runPreviewVoiceExit = () =>
  Effect.runPromiseExit(
    Effect.gen(function* () {
      const tts = yield* TTS;
      return yield* tts.previewVoice({
        voiceId: 'Charon',
      });
    }).pipe(
      Effect.provide(
        GoogleTTSLive({
          apiKey: 'test-key',
        }),
      ),
    ),
  );

const createAudioPayload = () => {
  const audioContent = Buffer.from('RIFFmock-audio');
  return {
    audioContent,
    payload: {
      responseId: 'tts-response-1',
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/wav',
                  data: audioContent.toString('base64'),
                },
              },
            ],
          },
        },
      ],
    },
  };
};

describe('GoogleTTSLive', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('passes timeout abort signal and maps timeout to TTSError', async () => {
    fetchMock.mockRejectedValueOnce(
      new DOMException(
        'The operation was aborted due to timeout',
        'TimeoutError',
      ),
    );

    const exit = await runPreviewVoiceExit();

    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure') {
      expect(exit.cause._tag).toBe('Fail');
      if (exit.cause._tag === 'Fail') {
        expect(exit.cause.error._tag).toBe('TTSError');
      }
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init.signal).toBeDefined();
    expect(init.signal.aborted).toBe(false);
  });

  it('fails fast for unknown voice IDs before calling the provider', async () => {
    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.previewVoice({
          voiceId: 'UnknownVoice',
        });
      }).pipe(
        Effect.provide(
          GoogleTTSLive({
            apiKey: 'test-key',
          }),
        ),
      ),
    );

    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure') {
      expect(exit.cause._tag).toBe('Fail');
      if (exit.cause._tag === 'Fail') {
        expect(exit.cause.error._tag).toBe('VoiceNotFoundError');
        expect((exit.cause.error as VoiceNotFoundError).voiceId).toBe(
          'UnknownVoice',
        );
      }
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('records usage when previewVoice succeeds', async () => {
    const recorded: PersistAIUsageInput[] = [];
    const recorderLayer = Layer.succeed(AIUsageRecorder, {
      record: (input: PersistAIUsageInput) =>
        Effect.sync(() => {
          recorded.push(input);
        }),
    });

    const { audioContent, payload } = createAudioPayload();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...payload,
          usageMetadata: {
            promptTokenCount: 9,
            candidatesTokenCount: 4,
            totalTokenCount: 13,
          },
        }),
        { status: 200 },
      ),
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.previewVoice({
          voiceId: 'Charon',
          text: 'Preview this voice.',
        });
      }).pipe(
        withAIUsageScope({
          userId: 'user-1',
          requestId: 'req-1',
          operation: 'test.previewVoice',
        }),
        Effect.provide(
          Layer.mergeAll(GoogleTTSLive({ apiKey: 'test-key' }), recorderLayer),
        ),
      ),
    );

    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      userId: 'user-1',
      requestId: 'req-1',
      scopeOperation: 'test.previewVoice',
      modality: 'tts',
      provider: 'google',
      providerOperation: 'previewVoice',
      status: 'succeeded',
      providerResponseId: 'tts-response-1',
      usage: {
        inputChars: 'Preview this voice.'.length,
        outputAudioBytes: audioContent.length,
        promptTokens: 9,
        outputTokens: 4,
        totalTokens: 13,
      },
      estimatedCostUsdMicros: 45,
    });
  });

  it('builds an explicit ordered conversation prompt for multi-speaker synthesis', async () => {
    const { payload } = createAudioPayload();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.synthesize({
          turns: [
            { speaker: 'host', text: 'First line.' },
            { speaker: 'cohost', text: 'Second line.' },
          ],
          voiceConfigs: [
            { speakerAlias: 'host', voiceId: 'Charon' },
            { speakerAlias: 'cohost', voiceId: 'Kore' },
          ],
        });
      }).pipe(
        Effect.provide(
          GoogleTTSLive({
            apiKey: 'test-key',
          }),
        ),
      ),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as {
      contents: Array<{ parts: Array<{ text: string }> }>;
      generationConfig: {
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: Array<{
              speaker: string;
              voiceConfig: { prebuiltVoiceConfig: { voiceName: string } };
            }>;
          };
        };
      };
    };

    expect(body.contents[0]?.parts[0]?.text).toContain(
      'Read the following conversation aloud exactly as written.',
    );
    expect(body.contents[0]?.parts[0]?.text).toContain(
      'Keep the speakers in order and do not omit or paraphrase any line.',
    );
    expect(body.contents[0]?.parts[0]?.text).toContain('host: First line.');
    expect(body.contents[0]?.parts[0]?.text).toContain('cohost: Second line.');
    expect(
      body.generationConfig.speechConfig.multiSpeakerVoiceConfig
        .speakerVoiceConfigs,
    ).toEqual([
      {
        speaker: 'host',
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
      },
      {
        speaker: 'cohost',
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
    ]);
  });
});
