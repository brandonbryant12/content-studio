import { Effect } from 'effect';

type BestEffortAttributeValue = string | number | boolean | null | undefined;

export interface BestEffortSideEffectOptions {
  operation: string;
  attributes?: Record<string, BestEffortAttributeValue>;
}

const normalizeAttributes = (
  attributes?: Record<string, BestEffortAttributeValue>,
): Record<string, string | number | boolean | null> => {
  if (!attributes) return {};
  return Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => value !== undefined),
  ) as Record<string, string | number | boolean | null>;
};

const getErrorTag = (error: unknown): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    '_tag' in error &&
    typeof error._tag === 'string'
  ) {
    return error._tag;
  }
  return 'UnknownError';
};

/**
 * Run a side effect in best-effort mode without masking the parent flow.
 * Failures are logged with operation context and swallowed intentionally.
 */
export const runBestEffortSideEffect = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options: BestEffortSideEffectOptions,
): Effect.Effect<void, never, R> =>
  effect.pipe(
    Effect.asVoid,
    Effect.tapError((error) =>
      Effect.logWarning(
        `Best-effort side effect failed: ${options.operation} [errorTag:${getErrorTag(error)}]`,
      ),
    ),
    Effect.catchAll(() => Effect.void),
    Effect.withSpan('bestEffort.sideEffect', {
      attributes: {
        'bestEffort.operation': options.operation,
        ...normalizeAttributes(options.attributes),
      },
    }),
  );
