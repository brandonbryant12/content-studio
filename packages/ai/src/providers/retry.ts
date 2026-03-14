import { Effect, Schedule } from 'effect';

const TRANSIENT_ERROR_TAGS = new Set([
  'TTSError',
  'TTSQuotaExceededError',
  'ImageGenError',
  'ImageGenRateLimitError',
]);
const TRANSIENT_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const TRANSIENT_NETWORK_CODES = new Set([
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
const TRANSIENT_MESSAGE_TOKENS = [
  '429',
  '500',
  '502',
  '503',
  '504',
  'rate limit',
  'resource exhausted',
  'temporarily unavailable',
  'timeout',
  'timed out',
  'network',
  'socket hang up',
] as const;

type TaggedError = { _tag?: string };

export const retryTransientProvider = <A, E extends TaggedError, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> =>
  effect.pipe(
    // Bounded exponential backoff for transient provider failures.
    Effect.retry({
      times: 2,
      schedule: Schedule.exponential('500 millis'),
      while: (error) =>
        typeof error === 'object' &&
        error !== null &&
        TRANSIENT_ERROR_TAGS.has((error as TaggedError)._tag ?? ''),
    }),
  );

export const matchesTransientProviderFailure = (input: {
  readonly statusCode?: number;
  readonly statusName?: string;
  readonly networkCode?: string;
  readonly message?: string;
  readonly additionalStatusNames?: readonly string[];
  readonly additionalMessageTokens?: readonly string[];
}): boolean => {
  if (
    input.statusCode !== undefined &&
    TRANSIENT_STATUS_CODES.has(input.statusCode)
  ) {
    return true;
  }

  const statusName = input.statusName?.toUpperCase();
  if (
    statusName &&
    input.additionalStatusNames?.some((value) => value === statusName)
  ) {
    return true;
  }

  const networkCode = input.networkCode?.toUpperCase();
  if (networkCode && TRANSIENT_NETWORK_CODES.has(networkCode)) {
    return true;
  }

  const normalizedMessage = input.message?.toLowerCase();
  if (!normalizedMessage) {
    return false;
  }

  return [
    ...TRANSIENT_MESSAGE_TOKENS,
    ...(input.additionalMessageTokens ?? []),
  ].some((token) => normalizedMessage.includes(token));
};
