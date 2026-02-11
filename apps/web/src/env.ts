import { Schema } from 'effect';

export const CLIENT_ENV_PREFIX = 'PUBLIC_';

// Custom schema for path that starts with /
const PathStartingWithSlash = Schema.String.pipe(
  Schema.filter((input): input is `/${string}` => input.startsWith('/'), {
    message: () => 'Path must start with "/".',
  }),
);

export const envSchema = Schema.Struct({
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
