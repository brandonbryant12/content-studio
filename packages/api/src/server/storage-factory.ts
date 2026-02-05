import {
  DatabaseStorageLive,
  FilesystemStorageLive,
  S3StorageLive,
  type Storage,
} from '@repo/storage';
import { Layer } from 'effect';
import type { StorageConfig } from './orpc';
import type { Db } from '@repo/db/effect';

/**
 * Creates a storage layer based on the provided configuration.
 * Centralizes storage provider selection to avoid duplication.
 *
 * @param config - Storage configuration specifying the provider and its settings
 * @param dbLayer - Database layer (required for database storage provider)
 * @returns A Layer that provides the Storage service
 *
 * @example
 * ```typescript
 * const storageLayer = createStorageLayer(
 *   { provider: 'filesystem', basePath: './uploads', baseUrl: '/files' },
 *   dbLayer
 * );
 * ```
 */
export const createStorageLayer = (
  config: StorageConfig,
  dbLayer: Layer.Layer<Db, never, never>,
): Layer.Layer<Storage, never, never> => {
  switch (config.provider) {
    case 'filesystem':
      return FilesystemStorageLive({
        basePath: config.basePath,
        baseUrl: config.baseUrl,
      });
    case 's3':
      return S3StorageLive({
        bucket: config.bucket,
        region: config.region,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        endpoint: config.endpoint,
      });
    case 'database':
    default:
      return DatabaseStorageLive.pipe(Layer.provide(dbLayer)) as Layer.Layer<
        Storage,
        never,
        never
      >;
  }
};
