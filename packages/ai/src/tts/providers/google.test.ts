import { Effect } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
});
