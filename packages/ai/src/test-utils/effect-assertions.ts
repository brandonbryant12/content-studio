import { Cause, Exit, Option } from 'effect';

/**
 * Assert that an Effect exit is a failure containing the expected error type.
 * Returns the narrowed error instance for further assertions.
 *
 * Note: This is a local copy to avoid a cyclic dependency with @repo/testing.
 * The canonical version lives in packages/testing/src/effect-assertions.ts.
 */
export function expectEffectFailure<E, T extends E>(
  exit: Exit.Exit<unknown, E>,
  ErrorClass: abstract new (...args: never[]) => T,
): T {
  if (!Exit.isFailure(exit)) {
    throw new Error(`Expected Effect failure, got success`);
  }
  const option = Cause.failureOption(exit.cause);
  if (!Option.isSome(option)) {
    throw new Error(`Expected Fail cause, got ${exit.cause._tag}`);
  }
  if (!(option.value instanceof ErrorClass)) {
    throw new Error(
      `Expected ${ErrorClass.name}, got ${(option.value as object)?.constructor?.name ?? typeof option.value}`,
    );
  }
  return option.value as T;
}
