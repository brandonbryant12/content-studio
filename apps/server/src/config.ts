import type { StorageConfig } from '@repo/api/server';
import { env } from './env';
import { createBearerCorsPolicy } from './middleware/cors-policy';

export const buildStorageConfig = (): StorageConfig => {
  if (
    !env.S3_BUCKET ||
    !env.S3_REGION ||
    !env.S3_ACCESS_KEY_ID ||
    !env.S3_SECRET_ACCESS_KEY
  ) {
    throw new Error(
      'S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY are required. Local MinIO defaults: S3_BUCKET=content-studio S3_REGION=us-east-1 S3_ACCESS_KEY_ID=minioadmin S3_SECRET_ACCESS_KEY=minioadmin S3_ENDPOINT=http://localhost:9001',
    );
  }

  return {
    provider: 's3',
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    endpoint: env.S3_ENDPOINT,
    publicEndpoint: env.S3_PUBLIC_ENDPOINT,
  };
};

export const bearerCorsPolicy = createBearerCorsPolicy({
  publicWebUrl: env.PUBLIC_WEB_URL,
  corsOrigins: env.CORS_ORIGINS,
});
