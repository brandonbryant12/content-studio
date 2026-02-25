import { Effect, Either } from 'effect';

export interface SchemaContractAttemptErrorContext<E> {
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly error: E;
  readonly willRetry: boolean;
}

export interface SchemaContractRetryOptions<A, E, R, R2 = never> {
  readonly maxAttempts: number;
  readonly run: (attempt: number) => Effect.Effect<A, E, R>;
  readonly onAttemptError?: (
    ctx: SchemaContractAttemptErrorContext<E>,
  ) => Effect.Effect<void, never, R2>;
}

export const runSchemaContractWithRetries = <A, E, R, R2 = never>(
  options: SchemaContractRetryOptions<A, E, R, R2>,
) =>
  Effect.gen(function* () {
    const maxAttempts = Math.max(1, options.maxAttempts);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const result = yield* options.run(attempt).pipe(Effect.either);
      if (Either.isRight(result)) {
        return result.right;
      }

      const willRetry = attempt < maxAttempts;
      if (options.onAttemptError) {
        yield* options.onAttemptError({
          attempt,
          maxAttempts,
          error: result.left,
          willRetry,
        });
      }

      if (!willRetry) {
        return yield* Effect.fail(result.left);
      }
    }

    return yield* Effect.die('unreachable schema retry state');
  });
