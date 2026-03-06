import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VoiceNotFoundError } from '../../errors';
import {
  AIUsageRecorder,
  type PersistAIUsageInput,
  withAIUsageScope,
} from '../../usage';
import { TTS } from '../service';
import { GoogleTTSLive } from './google';

vi.mock('../../provider-retry', () => ({
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

    const audioContent = Buffer.from('RIFFmock-audio');
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          responseId: 'tts-response-1',
          usageMetadata: {
            promptTokenCount: 9,
            candidatesTokenCount: 4,
            totalTokenCount: 13,
          },
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
});
