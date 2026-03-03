import { Effect } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROVIDER_TIMEOUTS_MS } from '../../provider-timeouts';
import { ImageGen } from '../service';
import { GoogleImageGenLive } from './google';

vi.mock('../../provider-retry', () => ({
  retryTransientProvider: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E, R> => effect,
}));

const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    readonly models = {
      generateContent: mockGenerateContent,
    };
  },
}));

const runGenerateImageExit = () =>
  Effect.runPromiseExit(
    Effect.gen(function* () {
      const imageGen = yield* ImageGen;
      return yield* imageGen.generateImage({
        prompt: 'A city skyline',
        format: 'square',
      });
    }).pipe(
      Effect.provide(
        GoogleImageGenLive({
          apiKey: 'test-key',
        }),
      ),
    ),
  );

describe('GoogleImageGenLive', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  it('passes timeout budget and maps timeout failures to ImageGenError', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new DOMException(
        'The operation was aborted due to timeout',
        'TimeoutError',
      ),
    );

    const exit = await runGenerateImageExit();

    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure') {
      expect(exit.cause._tag).toBe('Fail');
      if (exit.cause._tag === 'Fail') {
        expect(exit.cause.error._tag).toBe('ImageGenError');
      }
    }

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const [params] = mockGenerateContent.mock.calls[0] ?? [];
    expect(params.config.httpOptions.timeout).toBe(
      PROVIDER_TIMEOUTS_MS.imageGenerate,
    );
    expect(params.config.abortSignal).toBeDefined();
    expect(params.config.abortSignal.aborted).toBe(false);
  });
});
