import { Effect, Schedule } from 'effect';

const TRANSIENT_ERROR_TAGS = new Set([
  'TTSError',
  'TTSQuotaExceededError',
  'ImageGenError',
  'ImageGenRateLimitError',
]);

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
