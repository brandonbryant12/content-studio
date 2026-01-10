import { Context } from 'effect';
import type { ImageError, ImageQuotaExceededError } from '../errors';
import type { Effect } from 'effect';

/**
 * Supported aspect ratios for image generation.
 */
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9';

/**
 * Options for image generation.
 */
export interface GenerateImageOptions {
  readonly prompt: string;
  readonly aspectRatio?: AspectRatio; // Default: '1:1'
  readonly referenceImages?: readonly Buffer[]; // Optional reference images
}

/**
 * Result from image generation.
 */
export interface GenerateImageResult {
  readonly imageContent: Buffer;
  readonly mimeType: string; // 'image/png'
  readonly width: number;
  readonly height: number;
}

/**
 * Image generation service interface.
 * Provider-agnostic - currently implemented with Google Gemini.
 */
export interface ImageService {
  /**
   * Generate an image from a text prompt.
   */
  readonly generate: (
    options: GenerateImageOptions,
  ) => Effect.Effect<GenerateImageResult, ImageError | ImageQuotaExceededError>;
}

/**
 * Image service Context.Tag for dependency injection.
 */
export class Image extends Context.Tag('@repo/ai/Image')<Image, ImageService>() {}
