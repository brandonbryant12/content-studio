import type { StorageConfig } from '@repo/api/server';
import { env } from './env';

/**
 * Storage configuration from environment variables.
 */
export const storageConfig: StorageConfig = {
  bucket: env.S3_BUCKET,
  region: env.S3_REGION,
  accessKeyId: env.S3_ACCESS_KEY_ID,
  secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  endpoint: env.S3_ENDPOINT,
};

/**
 * Trusted origins for CORS (derived from PUBLIC_WEB_URL).
 */
export const trustedOrigins = [env.PUBLIC_WEB_URL].map(
  (url) => new URL(url).origin,
);
