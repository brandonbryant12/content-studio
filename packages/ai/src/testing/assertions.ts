import { Cause, Option, type Exit } from 'effect';
import { expect } from 'vitest';

export function expectTaggedFailure<
  E extends { readonly _tag: string },
  T extends E['_tag'],
>(
  exit: Exit.Exit<unknown, E>,
  expectedTag: T,
): Extract<E, { readonly _tag: T }> {
  expect(exit._tag).toBe('Failure');
  if (exit._tag !== 'Failure') {
    throw new Error(`Expected Failure exit, received ${exit._tag}`);
  }

  const failure = Cause.failureOption(exit.cause);
  expect(Option.isSome(failure)).toBe(true);
  if (Option.isNone(failure)) {
    throw new Error(`Expected a typed failure, received ${exit.cause._tag}`);
  }

  expect(failure.value._tag).toBe(expectedTag);
  return failure.value as Extract<E, { readonly _tag: T }>;
}
