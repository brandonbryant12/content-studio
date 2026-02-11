import { Cause, Exit, Option } from 'effect';

/**
 * Assert that an Effect exit is a failure containing the expected error type.
 * Returns the narrowed error instance for further assertions.
 *
 * Throws plain errors on failure instead of using vitest's `expect`,
 * so this module is safe to import at runtime (no vitest dependency).
 */
export function expectEffectFailure<E, T extends E>(
  exit: Exit.Exit<unknown, E>,
  ErrorClass: new (...args: any[]) => T,
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
      `Expected ${ErrorClass.name}, got ${(option.value as any)?.constructor?.name ?? typeof option.value}`,
    );
  }
  return option.value as T;
}
