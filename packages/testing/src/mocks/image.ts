import {
  Image,
  type ImageService,
  type GenerateImageResult,
  ImageError,
  type ImageQuotaExceededError,
} from '@repo/ai';
import { Layer, Effect } from 'effect';

/**
 * Default mock image data - a 1x1 transparent PNG.
 */
const MOCK_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Default mock image result.
 */
export const DEFAULT_MOCK_IMAGE: GenerateImageResult = {
  imageContent: MOCK_PNG_BUFFER,
  mimeType: 'image/png',
  width: 1024,
  height: 1024,
};

/**
 * Options for creating a mock Image service.
 */
export interface MockImageOptions {
  /**
   * Simulated delay in milliseconds before returning.
   */
  delay?: number;

  /**
   * Custom image result to return instead of the default.
   */
  result?: GenerateImageResult;

  /**
   * If set, the generate method will fail with this error message.
   */
  errorMessage?: string;
}

/**
 * Create a mock Image layer for testing.
 *
 * @example
 * ```ts
 * const MockImage = createMockImage({ delay: 100 });
 *
 * await Effect.runPromise(
 *   imageService.generate({ prompt: 'test' }).pipe(
 *     Effect.provide(MockImage)
 *   )
 * );
 * ```
 */
export const createMockImage = (
  options: MockImageOptions = {},
): Layer.Layer<Image> => {
  const service: ImageService = {
    generate: (): Effect.Effect<
      GenerateImageResult,
      ImageError | ImageQuotaExceededError
    > =>
      Effect.gen(function* () {
        if (options.delay) {
          yield* Effect.sleep(options.delay);
        }

        if (options.errorMessage) {
          return yield* Effect.fail(
            new ImageError({ message: options.errorMessage }),
          );
        }

        return options.result ?? DEFAULT_MOCK_IMAGE;
      }),
  };

  return Layer.succeed(Image, service);
};

/**
 * Default mock Image layer with standard test responses.
 * No delay for fast tests.
 */
export const MockImageLive = createMockImage();

/**
 * Mock Image layer with realistic latency for dev server.
 * Simulates 5 second image generation time.
 */
export const MockImageWithLatency = createMockImage({ delay: 5_000 });
