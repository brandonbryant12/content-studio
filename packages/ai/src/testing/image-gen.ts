import { Layer, Effect } from 'effect';
import { ImageGenError } from '../errors';
import {
  ImageGen,
  type GenerateImageResult,
  type ImageGenService,
} from '../image-gen/service';

export interface MockImageGenOptions {
  delay?: number;
  imageData?: Buffer;
  shouldRejectContent?: boolean;
  generateImage?: ImageGenService['generateImage'];
}

/** 1x1 transparent PNG for fast tests. */
const MOCK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

export function createMockImageGen(
  options: MockImageGenOptions = {},
): Layer.Layer<ImageGen> {
  const service = createMockImageGenService(options);
  return Layer.succeed(ImageGen, service);
}

export function createMockImageGenService(
  options: MockImageGenOptions = {},
): ImageGenService {
  const {
    delay = 0,
    imageData = MOCK_PNG,
    shouldRejectContent = false,
    generateImage,
  } = options;

  const defaultGenerateImage: ImageGenService['generateImage'] = (_options) =>
    Effect.gen(function* () {
      if (delay > 0) {
        yield* Effect.sleep(delay);
      }

      if (shouldRejectContent) {
        return yield* Effect.fail(
          new ImageGenError({
            message: 'Content was filtered by safety settings',
          }),
        );
      }

      return {
        imageData,
        mimeType: 'image/png',
      } satisfies GenerateImageResult;
    });

  return {
    generateImage: generateImage ?? defaultGenerateImage,
  };
}

export const MockImageGenLive = createMockImageGen();

export const MockImageGenWithLatency = createMockImageGen({ delay: 8_000 });
