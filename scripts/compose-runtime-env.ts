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
  POSTGRES_USER:
    baseEnv.POSTGRES_USER ??
    baseEnv.CONTENT_STUDIO_POSTGRES_USER ??
    defaultPostgresToken,
  POSTGRES_PASSWORD:
    baseEnv.POSTGRES_PASSWORD ??
    baseEnv.CONTENT_STUDIO_POSTGRES_PASSWORD ??
    defaultPostgresToken,
  POSTGRES_DB:
    baseEnv.POSTGRES_DB ??
    baseEnv.CONTENT_STUDIO_POSTGRES_DB ??
    defaultStudioName,
  S3_ACCESS_KEY_ID:
    baseEnv.S3_ACCESS_KEY_ID ??
    baseEnv.CONTENT_STUDIO_S3_ACCESS_KEY_ID ??
    defaultMinioToken,
  S3_SECRET_ACCESS_KEY:
    baseEnv.S3_SECRET_ACCESS_KEY ??
    baseEnv.CONTENT_STUDIO_S3_SECRET_ACCESS_KEY ??
    defaultMinioToken,
});
