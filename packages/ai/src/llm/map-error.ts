import { NoObjectGeneratedError } from 'ai';
import { LLMError, LLMRateLimitError } from '../errors';
import {
  getGoogleApiErrorDetails,
  isGoogleRateLimit,
} from '../providers/google/error-parser';

const RETRYABLE_STATUS_CODES = new Set([
  408, 409, 425, 429, 500, 502, 503, 504,
]);
const RETRYABLE_STATUS_NAMES = new Set([
  'RESOURCE_EXHAUSTED',
  'TOO_MANY_REQUESTS',
  'UNAVAILABLE',
  'DEADLINE_EXCEEDED',
  'INTERNAL',
  'ABORTED',
]);
const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ECONNABORTED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
]);

function getStringField(value: unknown, field: string): string | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const maybeValue = (value as Record<string, unknown>)[field];
  return typeof maybeValue === 'string' ? maybeValue : undefined;
}

function getNumberField(value: unknown, field: string): number | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const maybeValue = (value as Record<string, unknown>)[field];
  return typeof maybeValue === 'number' ? maybeValue : undefined;
}

function getBooleanField(value: unknown, field: string): boolean | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const maybeValue = (value as Record<string, unknown>)[field];
  return typeof maybeValue === 'boolean' ? maybeValue : undefined;
}

function isTransientError(error: unknown): {
  readonly isRetryable: boolean;
  readonly statusCode: number | undefined;
  readonly errorCode: string | undefined;
  readonly message: string | undefined;
} {
  const details = getGoogleApiErrorDetails(error);
  const statusCode =
    getNumberField(error, 'statusCode') ?? getNumberField(error, 'status');
  const statusName = (
    details?.status ?? getStringField(error, 'status')
  )?.toUpperCase();
  const errorCode = getStringField(error, 'code')?.toUpperCase();
  const message =
    details?.message ?? (error instanceof Error ? error.message : undefined);

  if (NoObjectGeneratedError.isInstance(error)) {
    return {
      isRetryable: true,
      statusCode,
      errorCode: 'NO_OBJECT_GENERATED',
      message,
    };
  }

  if (isGoogleRateLimit(details, statusCode)) {
    return {
      isRetryable: true,
      statusCode,
      errorCode,
      message,
    };
  }

  if (statusCode !== undefined && RETRYABLE_STATUS_CODES.has(statusCode)) {
    return {
      isRetryable: true,
      statusCode,
      errorCode,
      message,
    };
  }

  if (statusName && RETRYABLE_STATUS_NAMES.has(statusName)) {
    return {
      isRetryable: true,
      statusCode,
      errorCode: statusName,
      message,
    };
  }

  if (errorCode && RETRYABLE_NETWORK_CODES.has(errorCode)) {
    return {
      isRetryable: true,
      statusCode,
      errorCode,
      message,
    };
  }

  const sdkRetryable = getBooleanField(error, 'isRetryable');
  if (sdkRetryable === true) {
    return {
      isRetryable: true,
      statusCode,
      errorCode,
      message,
    };
  }

  const normalizedMessage = message?.toLowerCase();
  if (
    normalizedMessage &&
    (normalizedMessage.includes('timeout') ||
      normalizedMessage.includes('timed out') ||
      normalizedMessage.includes('network') ||
      normalizedMessage.includes('socket hang up') ||
      normalizedMessage.includes('temporary'))
  ) {
    return {
      isRetryable: true,
      statusCode,
      errorCode,
      message,
    };
  }

  return {
    isRetryable: false,
    statusCode,
    errorCode,
    message,
  };
}

export function shouldRetryLLMError(error: LLMError): boolean {
  return error.isRetryable === true;
}

/**
 * Map LLM API errors to domain errors.
 */
export function mapError(error: unknown): LLMError | LLMRateLimitError {
  const details = getGoogleApiErrorDetails(error);
  const statusCode =
    getNumberField(error, 'statusCode') ?? getNumberField(error, 'status');
  const message =
    details?.message ?? (error instanceof Error ? error.message : undefined);

  if (
    isGoogleRateLimit(details, statusCode) ||
    message?.toLowerCase().includes('rate limit') ||
    message?.includes('429')
  ) {
    return new LLMRateLimitError({
      message: message ?? 'LLM rate limit exceeded',
    });
  }

  const transient = isTransientError(error);

  if (error instanceof Error) {
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      const finishReason =
        typeof error.finishReason === 'string'
          ? ` finishReason=${error.finishReason}`
          : '';
      const textLength =
        typeof error.text === 'string'
          ? ` textLength=${error.text.length}`
          : '';
      console.error(
        `[LLM] Failed to parse model output:${finishReason}${textLength}`,
        error.text,
      );
    }

    return new LLMError({
      message: transient.message ?? error.message,
      statusCode: transient.statusCode,
      errorCode: transient.errorCode,
      isRetryable: transient.isRetryable,
      cause: error,
    });
  }

  return new LLMError({
    message: transient.message ?? 'Unknown LLM error',
    statusCode: transient.statusCode,
    errorCode: transient.errorCode,
    isRetryable: transient.isRetryable,
    cause: error,
  });
}
