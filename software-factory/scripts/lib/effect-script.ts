import { Effect } from 'effect';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export const runScript = (run: () => Promise<void | number>): void => {
  void Effect.runPromise(
    Effect.tryPromise({
      try: run,
      catch: toError,
    }),
  )
    .then((status) => {
      if (typeof status === 'number' && status !== 0) {
        process.exitCode = status;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
};
