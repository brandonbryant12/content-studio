import { TTSError, TTSQuotaExceededError } from '../errors';
import {
  GoogleApiError,
  getGoogleApiErrorDetails,
  isGoogleRateLimit,
} from '../providers/google/error-parser';

/**
 * Map TTS API errors to domain errors.
 */
export function mapError(error: unknown): TTSError | TTSQuotaExceededError {
  const details = getGoogleApiErrorDetails(error);
  const message =
    details?.message ?? (error instanceof Error ? error.message : undefined);

  const statusCode =
    error instanceof GoogleApiError ? error.statusCode : undefined;

  if (
    isGoogleRateLimit(details, statusCode) ||
    message?.toLowerCase().includes('quota') ||
    message?.includes('429')
  ) {
    return new TTSQuotaExceededError({
      message: message ?? 'TTS quota exceeded',
    });
  }

  if (error instanceof Error) {
    return new TTSError({
      message: message ?? error.message,
      cause: error,
    });
  }

  return new TTSError({
    message: 'Unknown TTS error',
    cause: error,
  });
}
