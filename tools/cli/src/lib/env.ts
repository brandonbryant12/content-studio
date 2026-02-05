import { Effect, Schema } from 'effect';

const EnvSchema = Schema.Struct({
  GEMINI_API_KEY: Schema.String,
});

type Env = typeof EnvSchema.Type;

export class EnvError {
  readonly _tag = 'EnvError';
  constructor(readonly message: string) {}
}

export const loadEnv = (): Effect.Effect<Env, EnvError> =>
  // eslint-disable-next-line no-restricted-properties
  Schema.decodeUnknown(EnvSchema)(process.env).pipe(
    Effect.mapError(
      () =>
        new EnvError(
          'GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.',
        ),
    ),
  );
