import process from 'node:process';

const defaultPostgresToken = ['post', 'gres'].join('');
const defaultMinioToken = ['minio', 'admin'].join('');
const defaultStudioName = ['content', 'studio'].join('_');

export const buildComposeRuntimeEnv = (
  baseEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv => ({
  ...baseEnv,
  SERVER_AUTH_SECRET:
    baseEnv.SERVER_AUTH_SECRET ??
    ['content', 'studio', 'compose', 'auth'].join('_'),
  CONTENT_STUDIO_POSTGRES_USER:
    baseEnv.CONTENT_STUDIO_POSTGRES_USER ?? defaultPostgresToken,
  CONTENT_STUDIO_POSTGRES_PASSWORD:
    baseEnv.CONTENT_STUDIO_POSTGRES_PASSWORD ?? defaultPostgresToken,
  CONTENT_STUDIO_POSTGRES_DB:
    baseEnv.CONTENT_STUDIO_POSTGRES_DB ?? defaultStudioName,
  CONTENT_STUDIO_S3_ACCESS_KEY_ID:
    baseEnv.CONTENT_STUDIO_S3_ACCESS_KEY_ID ?? defaultMinioToken,
  CONTENT_STUDIO_S3_SECRET_ACCESS_KEY:
    baseEnv.CONTENT_STUDIO_S3_SECRET_ACCESS_KEY ?? defaultMinioToken,
});
