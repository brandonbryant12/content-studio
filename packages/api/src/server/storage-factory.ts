import { S3StorageLive, type Storage } from '@repo/storage';
import { Layer } from 'effect';
import type { StorageConfig } from './orpc';

/**
 * Creates the S3 storage layer.
 *
 * @param config - S3/MinIO storage configuration
 * @returns A Layer that provides the Storage service
 */
export const createStorageLayer = (
  config: StorageConfig,
): Layer.Layer<Storage, never, never> =>
  S3StorageLive({
    bucket: config.bucket,
    region: config.region,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: config.endpoint,
  });
