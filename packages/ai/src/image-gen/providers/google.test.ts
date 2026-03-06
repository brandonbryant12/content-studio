import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROVIDER_TIMEOUTS_MS } from '../../provider-timeouts';
import {
  AIUsageRecorder,
  type PersistAIUsageInput,
  withAIUsageScope,
} from '../../usage';
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

  it('records usage when image generation succeeds', async () => {
    const recorded: PersistAIUsageInput[] = [];
    const recorderLayer = Layer.succeed(AIUsageRecorder, {
      record: (input: PersistAIUsageInput) =>
        Effect.sync(() => {
          recorded.push(input);
        }),
    });

    const imageBytes = Buffer.from('image-bytes');
    mockGenerateContent.mockResolvedValueOnce({
      responseId: 'image-response-1',
      usageMetadata: {
        promptTokenCount: 13,
        candidatesTokenCount: 12,
        totalTokenCount: 25,
      },
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  data: imageBytes.toString('base64'),
                  mimeType: 'image/png',
                },
              },
            ],
          },
        },
      ],
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        const imageGen = yield* ImageGen;
        return yield* imageGen.generateImage({
          prompt: 'A city skyline',
          format: 'square',
        });
      }).pipe(
        withAIUsageScope({
          userId: 'user-1',
          requestId: 'req-1',
          operation: 'test.generateImage',
        }),
        Effect.provide(
          Layer.mergeAll(
            GoogleImageGenLive({ apiKey: 'test-key' }),
            recorderLayer,
          ),
        ),
      ),
    );

    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      userId: 'user-1',
      requestId: 'req-1',
      scopeOperation: 'test.generateImage',
      modality: 'image_generation',
      provider: 'google',
      providerOperation: 'generateImage',
      status: 'succeeded',
      providerResponseId: 'image-response-1',
      usage: {
        imageCount: 1,
        promptChars: 'A city skyline'.length,
        outputImageBytes: imageBytes.length,
        promptTokens: 13,
        outputTokens: 12,
        totalTokens: 25,
      },
      estimatedCostUsdMicros: 727,
    });
  });
});
