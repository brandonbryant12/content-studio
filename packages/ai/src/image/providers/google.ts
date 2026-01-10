import { ImageError, ImageQuotaExceededError } from '../../errors';
import { Effect, Layer } from 'effect';
import {
  Image,
  type ImageService,
  type GenerateImageOptions,
  type GenerateImageResult,
  type AspectRatio,
} from '../service';

/**
 * Configuration for Google Image generation provider.
 */
export interface GoogleImageConfig {
  /** API key - required */
  readonly apiKey: string;
  /** Default: 'gemini-2.5-flash-preview-image-generation' */
  readonly model?: string;
}

/**
 * Map API errors to domain errors.
 */
const mapError = (error: unknown): ImageError | ImageQuotaExceededError => {
  if (error instanceof Error) {
    // Check for rate limit / quota errors
    if (
      error.message.includes('rate limit') ||
      error.message.includes('429') ||
      error.message.includes('quota')
    ) {
      return new ImageQuotaExceededError({
        message: error.message,
      });
    }

    return new ImageError({
      message: error.message,
      cause: error,
    });
  }

  return new ImageError({
    message: 'Unknown image generation error',
    cause: error,
  });
};

/**
 * Get dimensions based on aspect ratio.
 * Gemini uses default dimensions based on aspect ratio.
 */
const getDimensionsForAspectRatio = (
  aspectRatio: AspectRatio,
): { width: number; height: number } => {
  switch (aspectRatio) {
    case '1:1':
      return { width: 1024, height: 1024 };
    case '16:9':
      return { width: 1792, height: 1008 };
    case '9:16':
      return { width: 1008, height: 1792 };
    case '4:3':
      return { width: 1344, height: 1008 };
    case '3:4':
      return { width: 1008, height: 1344 };
    case '21:9':
      return { width: 2016, height: 864 };
    default:
      return { width: 1024, height: 1024 };
  }
};

interface GeminiImageResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
  error?: {
    message: string;
    code?: number;
  };
}

/**
 * Create Google Image service implementation.
 */
const makeGoogleImageService = (config: GoogleImageConfig): ImageService => {
  const modelId = config.model ?? 'gemini-2.5-flash-preview-image-generation';
  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  return {
    generate: (options: GenerateImageOptions) =>
      Effect.tryPromise({
        try: async () => {
          const aspectRatio = options.aspectRatio ?? '1:1';

          const requestBody = {
            contents: [
              {
                parts: [{ text: options.prompt }],
              },
            ],
            generationConfig: {
              responseModalities: ['IMAGE', 'TEXT'],
              imageSafetyMode: 'BLOCK_NONE',
            },
          };

          const url = `${baseUrl}/models/${modelId}:generateContent?key=${config.apiKey}`;

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Gemini API error (${response.status}): ${errorText}`,
            );
          }

          const data = (await response.json()) as GeminiImageResponse;

          if (data.error) {
            throw new Error(data.error.message);
          }

          const inlineData = data.candidates?.[0]?.content?.parts?.find(
            (part) => part.inlineData,
          )?.inlineData;

          if (!inlineData) {
            throw new Error('No image data in response');
          }

          const imageBuffer = Buffer.from(inlineData.data, 'base64');
          const dimensions = getDimensionsForAspectRatio(aspectRatio);

          const result: GenerateImageResult = {
            imageContent: imageBuffer,
            mimeType: inlineData.mimeType,
            width: dimensions.width,
            height: dimensions.height,
          };

          return result;
        },
        catch: mapError,
      }).pipe(
        Effect.withSpan('image.generate', {
          attributes: {
            'image.provider': 'google',
            'image.model': modelId,
            'image.aspectRatio': options.aspectRatio ?? '1:1',
          },
        }),
      ),
  };
};

/**
 * Create Google Image service layer.
 *
 * @example
 * ```typescript
 * const ImageLive = GoogleImageLive({ apiKey: env.GEMINI_API_KEY });
 *
 * const program = Effect.gen(function* () {
 *   const image = yield* Image;
 *   const result = yield* image.generate({
 *     prompt: 'A beautiful sunset over mountains',
 *     aspectRatio: '16:9',
 *   });
 *   return result.imageContent;
 * }).pipe(Effect.provide(ImageLive));
 * ```
 */
export const GoogleImageLive = (
  config: GoogleImageConfig,
): Layer.Layer<Image> => Layer.succeed(Image, makeGoogleImageService(config));
