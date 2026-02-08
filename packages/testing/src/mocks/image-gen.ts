import {
  ImageGen,
  type ImageGenService,
  type GenerateImageResult,
  ImageGenError,
} from '@repo/ai';
import { Layer, Effect } from 'effect';

/**
 * Options for creating a mock ImageGen service.
 */
export interface MockImageGenOptions {
  /** Simulated delay in milliseconds before returning. */
  delay?: number;
  /** Custom image data to return. */
  imageData?: Buffer;
  /** If true, simulate a content-filtered rejection. */
  shouldRejectContent?: boolean;
}

/**
 * 1x1 transparent PNG for fast tests.
 */
const MOCK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Create a mock ImageGen service with configurable behavior.
 */
export const createMockImageGen = (
  options: MockImageGenOptions = {},
): Layer.Layer<ImageGen> => {
  const {
    delay = 0,
    imageData = MOCK_PNG,
    shouldRejectContent = false,
  } = options;

  const service: ImageGenService = {
    generateImage: (_opts) =>
      Effect.gen(function* () {
        if (delay > 0) {
          yield* Effect.sleep(delay);
        }

        if (shouldRejectContent) {
          return yield* new ImageGenError({
            message: 'Content was filtered by safety settings',
          });
        }

        return {
          imageData,
          mimeType: 'image/png',
        } satisfies GenerateImageResult;
      }),
  };

  return Layer.succeed(ImageGen, service);
};

/**
 * Mock ImageGen with no delay for fast tests.
 */
export const MockImageGenLive = createMockImageGen();

/**
 * Mock ImageGen with realistic latency (8s) for dev server.
 */
export const MockImageGenWithLatency = createMockImageGen({ delay: 8_000 });
