import { GoogleGenAI } from '@google/genai';
import { Effect, Layer } from 'effect';
import type { JsonValue } from '@repo/db/schema';
import { IMAGE_GEN_MODEL } from '../../models';
import { retryTransientProvider } from '../../provider-retry';
import { PROVIDER_TIMEOUTS_MS } from '../../provider-timeouts';
import { recordAIUsageIfConfigured } from '../../usage';
import { mapError } from '../map-error';
import {
  ImageGen,
  type ImageGenService,
  type GenerateImageOptions,
  type GenerateImageResult,
} from '../service';

/**
 * Configuration for Google Image Gen provider.
 */
export interface GoogleImageGenConfig {
  readonly apiKey: string;
  readonly model?: string;
}

/**
 * Format to dimension hint for prompting.
 * The model uses the prompt + aspect ratio hint to generate appropriately.
 */
const FORMAT_HINTS: Record<GenerateImageOptions['format'], string> = {
  portrait: '1080x1920 portrait aspect ratio (9:16)',
  square: '1080x1080 square aspect ratio (1:1)',
  landscape: '1920x1080 landscape aspect ratio (16:9)',
  og_card: '1200x630 wide landscape aspect ratio (approximately 1.9:1)',
};

const compactJsonRecord = (
  record: Record<string, JsonValue | undefined>,
): Record<string, JsonValue> =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as Record<string, JsonValue>;

const getObjectField = (
  value: unknown,
  field: string,
): Record<string, unknown> | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const maybeValue = (value as Record<string, unknown>)[field];
  return typeof maybeValue === 'object' && maybeValue !== null
    ? (maybeValue as Record<string, unknown>)
    : undefined;
};

const getStringField = (value: unknown, field: string): string | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const maybeValue = (value as Record<string, unknown>)[field];
  return typeof maybeValue === 'string' ? maybeValue : undefined;
};

const getNumberField = (
  value: Record<string, unknown> | undefined,
  field: string,
): number | undefined => {
  const maybeValue = value?.[field];
  return typeof maybeValue === 'number' ? maybeValue : undefined;
};

const buildImageUsage = (input: {
  readonly promptChars: number;
  readonly outputImageBytes: number;
  readonly referenceImageBytes?: number;
  readonly usageMetadata?: Record<string, unknown>;
}) =>
  compactJsonRecord({
    imageCount: 1,
    promptChars: input.promptChars,
    outputImageBytes: input.outputImageBytes,
    referenceImageBytes: input.referenceImageBytes,
    promptTokens: getNumberField(input.usageMetadata, 'promptTokenCount'),
    outputTokens: getNumberField(input.usageMetadata, 'candidatesTokenCount'),
    totalTokens: getNumberField(input.usageMetadata, 'totalTokenCount'),
    thoughtsTokens: getNumberField(input.usageMetadata, 'thoughtsTokenCount'),
    cachedInputTokens: getNumberField(
      input.usageMetadata,
      'cachedContentTokenCount',
    ),
  });

/**
 * Create Google Image Gen service implementation via native SDK.
 */
const makeGoogleImageGenService = (
  config: GoogleImageGenConfig,
): ImageGenService => {
  const modelId = config.model ?? IMAGE_GEN_MODEL;

  const genAI = new GoogleGenAI({ apiKey: config.apiKey });

  return {
    generateImage: (options: GenerateImageOptions) =>
      (() => {
        const formatHint = FORMAT_HINTS[options.format];
        const fullPrompt = `${options.prompt}\n\nGenerate this as a ${formatHint} image.`;
        const referenceImageBytes = options.referenceImage?.data.length;
        const metadata = compactJsonRecord({
          format: options.format,
          promptChars: options.prompt.length,
          referenceImageBytes,
        });

        return Effect.tryPromise({
          try: async () => {
            // Build multimodal content when a reference image is provided
            const contents = options.referenceImage
              ? [
                  {
                    inlineData: {
                      data: options.referenceImage.data.toString('base64'),
                      mimeType: options.referenceImage.mimeType,
                    },
                  },
                  { text: fullPrompt },
                ]
              : fullPrompt;

            const response = await genAI.models.generateContent({
              model: modelId,
              contents,
              config: {
                responseModalities: ['IMAGE', 'TEXT'],
                // Per-attempt timeout budget: retries re-run generateContent.
                httpOptions: { timeout: PROVIDER_TIMEOUTS_MS.imageGenerate },
                abortSignal: AbortSignal.timeout(
                  PROVIDER_TIMEOUTS_MS.imageGenerate,
                ),
              },
            });

            const parts = response.candidates?.[0]?.content?.parts;
            if (!parts || parts.length === 0) {
              throw new Error('No content in image generation response');
            }

            const imagePart = parts.find((part) => part.inlineData);
            if (!imagePart?.inlineData) {
              throw new Error(
                'No image data in response — the model may have returned text only',
              );
            }

            const { data, mimeType } = imagePart.inlineData;
            if (!data) {
              throw new Error('Image data is empty');
            }

            return {
              result: {
                imageData: Buffer.from(data, 'base64'),
                mimeType: mimeType ?? 'image/png',
              } satisfies GenerateImageResult,
              responseId: getStringField(response, 'responseId'),
              usageMetadata: getObjectField(response, 'usageMetadata'),
            };
          },
          catch: mapError,
        }).pipe(
          Effect.tap(({ result, responseId, usageMetadata }) =>
            recordAIUsageIfConfigured({
              modality: 'image_generation',
              provider: 'google',
              providerOperation: 'generateImage',
              model: modelId,
              status: 'succeeded',
              providerResponseId: responseId ?? null,
              usage: buildImageUsage({
                promptChars: options.prompt.length,
                outputImageBytes: result.imageData.length,
                referenceImageBytes,
                usageMetadata,
              }),
              metadata,
              rawUsage: usageMetadata ?? null,
            }),
          ),
          Effect.tapError((error) =>
            recordAIUsageIfConfigured({
              modality: 'image_generation',
              provider: 'google',
              providerOperation: 'generateImage',
              model: modelId,
              status: 'failed',
              errorTag: error._tag,
              metadata,
            }),
          ),
          Effect.map(({ result }) => result),
        );
      })().pipe(
        retryTransientProvider,
        Effect.withSpan('imageGen.generate', {
          attributes: {
            'imageGen.provider': 'google',
            'imageGen.model': modelId,
            'imageGen.format': options.format,
          },
        }),
      ),
  };
};

/**
 * Create Google Image Gen service layer.
 *
 * @example
 * ```typescript
 * const ImageGenLive = GoogleImageGenLive({ apiKey: env.GEMINI_API_KEY });
 *
 * const program = Effect.gen(function* () {
 *   const imageGen = yield* ImageGen;
 *   const result = yield* imageGen.generateImage({
 *     prompt: 'A timeline infographic about climate change',
 *     format: 'portrait',
 *   });
 *   return result.imageData;
 * }).pipe(Effect.provide(ImageGenLive));
 * ```
 */
export const GoogleImageGenLive = (
  config: GoogleImageGenConfig,
): Layer.Layer<ImageGen> =>
  Layer.sync(ImageGen, () => makeGoogleImageGenService(config));
