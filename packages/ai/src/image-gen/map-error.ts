import {
  ImageGenError,
  ImageGenRateLimitError,
  ImageGenContentFilteredError,
} from '../errors';
import {
  GoogleApiError,
  getGoogleApiErrorDetails,
  isGoogleRateLimit,
} from '../providers/google/error-parser';

/**
 * Map API errors to domain errors.
 */
export const mapError = (
  error: unknown,
): ImageGenError | ImageGenRateLimitError | ImageGenContentFilteredError => {
  const details = getGoogleApiErrorDetails(error);
  const message =
    details?.message ?? (error instanceof Error ? error.message : undefined);
  const statusCode =
    error instanceof GoogleApiError ? error.statusCode : undefined;

  if (
    isGoogleRateLimit(details, statusCode) ||
    message?.toLowerCase().includes('rate limit') ||
    message?.includes('429')
  ) {
    return new ImageGenRateLimitError({
      message: message ?? 'Image generation rate limited',
      retryAfter:
        error instanceof GoogleApiError ? error.retryAfter : undefined,
    });
  }

  if (
    message &&
    (message.toLowerCase().includes('safety') ||
      message.toLowerCase().includes('blocked') ||
      message.toLowerCase().includes('content filter') ||
      message.toLowerCase().includes('prohibited'))
  ) {
    return new ImageGenContentFilteredError({
      message,
    });
  }

  if (error instanceof Error) {
    return new ImageGenError({
      message: message ?? error.message,
      cause: error,
    });
  }

  return new ImageGenError({
    message: 'Unknown image generation error',
    cause: error,
  });
};
