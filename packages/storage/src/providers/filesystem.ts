import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Effect, Layer } from 'effect';
import { StorageError, StorageNotFoundError, StorageUploadError } from '../errors';
import { Storage, type StorageService } from '../service';

export interface FilesystemStorageConfig {
  readonly basePath: string;
  readonly baseUrl: string;
}

const makeFilesystemStorage = (config: FilesystemStorageConfig): StorageService => ({
  upload: (key, data, _contentType) =>
    Effect.gen(function* () {
      const filePath = path.join(config.basePath, key);
      const dir = path.dirname(filePath);

      yield* Effect.tryPromise({
        try: () => fs.mkdir(dir, { recursive: true }),
        catch: (cause) =>
          new StorageUploadError({
            key,
            message: `Failed to create directory: ${dir}`,
            cause,
          }),
      });

      yield* Effect.tryPromise({
        try: () => fs.writeFile(filePath, data),
        catch: (cause) =>
          new StorageUploadError({
            key,
            message: `Failed to write file: ${filePath}`,
            cause,
          }),
      });

      return `${config.baseUrl}/${key}`;
    }).pipe(Effect.withSpan('storage.upload', { attributes: { 'storage.key': key, 'storage.provider': 'filesystem' } })),

  download: (key) =>
    Effect.gen(function* () {
      const filePath = path.join(config.basePath, key);

      const exists = yield* Effect.tryPromise({
        try: () =>
          fs
            .access(filePath)
            .then(() => true)
            .catch(() => false),
        catch: (cause) => new StorageError({ message: `Failed to check file: ${key}`, cause }),
      });

      if (!exists) {
        return yield* Effect.fail(new StorageNotFoundError({ key }));
      }

      return yield* Effect.tryPromise({
        try: () => fs.readFile(filePath),
        catch: (cause) => new StorageError({ message: `Failed to read file: ${key}`, cause }),
      });
    }).pipe(Effect.withSpan('storage.download', { attributes: { 'storage.key': key, 'storage.provider': 'filesystem' } })),

  delete: (key) =>
    Effect.tryPromise({
      try: () => fs.unlink(path.join(config.basePath, key)),
      catch: (cause) => new StorageError({ message: `Failed to delete file: ${key}`, cause }),
    }).pipe(Effect.withSpan('storage.delete', { attributes: { 'storage.key': key, 'storage.provider': 'filesystem' } })),

  getUrl: (key) =>
    Effect.succeed(`${config.baseUrl}/${key}`).pipe(
      Effect.withSpan('storage.getUrl', { attributes: { 'storage.key': key, 'storage.provider': 'filesystem' } }),
    ),

  exists: (key) =>
    Effect.tryPromise({
      try: () =>
        fs
          .access(path.join(config.basePath, key))
          .then(() => true)
          .catch(() => false),
      catch: (cause) => new StorageError({ message: `Failed to check file: ${key}`, cause }),
    }).pipe(Effect.withSpan('storage.exists', { attributes: { 'storage.key': key, 'storage.provider': 'filesystem' } })),
});

export const FilesystemStorageLive = (
  config: FilesystemStorageConfig,
): Layer.Layer<Storage> => Layer.succeed(Storage, makeFilesystemStorage(config));
