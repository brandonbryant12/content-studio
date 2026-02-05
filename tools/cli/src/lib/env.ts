import { Effect, Schema } from 'effect';

const EnvSchema = Schema.Struct({
  GEMINI_API_KEY: Schema.optional(Schema.String),
  GOOGLE_VERTEX_API_KEY: Schema.optional(Schema.String),
  HTTPS_PROXY: Schema.optional(Schema.String),
  HTTP_PROXY: Schema.optional(Schema.String),
  NO_PROXY: Schema.optional(Schema.String),
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
      () => new EnvError('Failed to parse environment variables.'),
    ),
  );
