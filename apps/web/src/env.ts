import { Schema } from 'effect';

// Custom schema for path that starts with /
const PathStartingWithSlash = Schema.String.pipe(
  Schema.filter((input): input is `/${string}` => input.startsWith('/'), {
    message: () => 'Path must start with "/".',
  }),
);

const AuthModeSchema = Schema.Union(
  Schema.Literal('dev-password'),
  Schema.Literal('sso-only'),
);

const BooleanStringSchema = Schema.transform(Schema.String, Schema.Boolean, {
  decode: (s) => s === 'true' || s === '1',
  encode: (b) => (b ? 'true' : 'false'),
});

const envSchema = Schema.Struct({
  /** Backend API server URL. Injected at runtime via env.js in production. */
  PUBLIC_SERVER_URL: Schema.String.pipe(
    Schema.filter(
      (s) => {
        try {
          new URL(s);
          return true;
        } catch {
          return false;
        }
      },
      { message: () => 'Invalid URL' },
    ),
  ),
  PUBLIC_SERVER_API_PATH: Schema.optionalWith(PathStartingWithSlash, {
    default: () => '/api' as `/${string}`,
  }),
  PUBLIC_AUTH_MODE: Schema.optionalWith(AuthModeSchema, {
    default: () => 'dev-password' as const,
  }),
  PUBLIC_DISABLE_DEEP_RESEARCH: Schema.optionalWith(BooleanStringSchema, {
    default: () => false,
  }),

  /**
   * Set this if you want to run or deploy your app at a base URL. This is
   * usually required for deploying a repository to Github/Gitlab pages.
   */
  PUBLIC_BASE_PATH: Schema.optionalWith(PathStartingWithSlash, {
    default: () => '/' as `/${string}`,
  }),
});

/**
 * Merge runtime config (window.__ENV__ from env.js in production) with
 * Vite's import.meta.env (used in development). Runtime values take
 * precedence so a single Docker image works across environments.
 */
const runtimeEnv: Record<string, unknown> = {
  ...import.meta.env,
  ...(((globalThis as Record<string, unknown>).__ENV__ as Record<
    string,
    unknown
  >) ?? {}),
};

export const env = Schema.decodeUnknownSync(envSchema)(runtimeEnv);

export const isPasswordAuthEnabled = env.PUBLIC_AUTH_MODE === 'dev-password';
export const isMicrosoftSSOAuthEnabled = env.PUBLIC_AUTH_MODE === 'sso-only';
export const isDeepResearchEnabled = !env.PUBLIC_DISABLE_DEEP_RESEARCH;
