import { Schema } from 'effect';

export const CLIENT_ENV_PREFIX = 'PUBLIC_';

// Custom schema for path that starts with /
const PathStartingWithSlash = Schema.String.pipe(
  Schema.filter((input): input is `/${string}` => input.startsWith('/'), {
    message: () => 'Path must start with "/".',
  }),
);

export const envSchema = Schema.Struct({
  /**
   * This is the backend API server. Note that this should be passed as
   * a build-time variable (ARG) in docker.
   */
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

export const env = Schema.decodeUnknownSync(envSchema)(import.meta.env);
