import { Effect, Layer } from 'effect';
import {
  StorageError,
  StorageNotFoundError,
  StorageUploadError,
} from '../errors';
import { Storage, type StorageService } from '../service';

export interface S3StorageConfig {
  readonly bucket: string;
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly endpoint?: string;
}

const makeS3Storage = (config: S3StorageConfig): StorageService => ({
  upload: (key, data, contentType) =>
    Effect.tryPromise({
      try: async () => {
        const endpoint =
          config.endpoint ?? `https://s3.${config.region}.amazonaws.com`;
        const url = `${endpoint}/${config.bucket}/${key}`;

        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
            'x-amz-acl': 'private',
          },
          body: new Uint8Array(data),
        });

        if (!response.ok) {
          throw new Error(`S3 upload failed: ${response.statusText}`);
        }

        return url;
      },
      catch: (cause) =>
        new StorageUploadError({
          key,
          message: `Failed to upload to S3: ${key}`,
          cause,
        }),
    }).pipe(
      Effect.withSpan('storage.upload', {
        attributes: {
          'storage.key': key,
          'storage.provider': 's3',
          'storage.bucket': config.bucket,
        },
      }),
    ),

  download: (key) =>
    Effect.tryPromise({
      try: async () => {
        const endpoint =
          config.endpoint ?? `https://s3.${config.region}.amazonaws.com`;
        const url = `${endpoint}/${config.bucket}/${key}`;

        const response = await fetch(url);

        if (response.status === 404) {
          throw { notFound: true };
        }

        if (!response.ok) {
          throw new Error(`S3 download failed: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      },
      catch: (cause) => {
        if (
          typeof cause === 'object' &&
          cause !== null &&
          'notFound' in cause
        ) {
          return new StorageNotFoundError({ key });
        }
        return new StorageError({
          message: `Failed to download from S3: ${key}`,
          cause,
        });
      },
    }).pipe(
      Effect.withSpan('storage.download', {
        attributes: {
          'storage.key': key,
          'storage.provider': 's3',
          'storage.bucket': config.bucket,
        },
      }),
    ),

  delete: (key) =>
    Effect.tryPromise({
      try: async () => {
        const endpoint =
          config.endpoint ?? `https://s3.${config.region}.amazonaws.com`;
        const url = `${endpoint}/${config.bucket}/${key}`;

        const response = await fetch(url, { method: 'DELETE' });

        if (!response.ok && response.status !== 404) {
          throw new Error(`S3 delete failed: ${response.statusText}`);
        }
      },
      catch: (cause) =>
        new StorageError({
          message: `Failed to delete from S3: ${key}`,
          cause,
        }),
    }).pipe(
      Effect.withSpan('storage.delete', {
        attributes: {
          'storage.key': key,
          'storage.provider': 's3',
          'storage.bucket': config.bucket,
        },
      }),
    ),

  getUrl: (key) =>
    Effect.succeed(
      `${config.endpoint ?? `https://s3.${config.region}.amazonaws.com`}/${config.bucket}/${key}`,
    ).pipe(
      Effect.withSpan('storage.getUrl', {
        attributes: {
          'storage.key': key,
          'storage.provider': 's3',
          'storage.bucket': config.bucket,
        },
      }),
    ),

  exists: (key) =>
    Effect.tryPromise({
      try: async () => {
        const endpoint =
          config.endpoint ?? `https://s3.${config.region}.amazonaws.com`;
        const url = `${endpoint}/${config.bucket}/${key}`;

        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
      },
      catch: () =>
        new StorageError({ message: `Failed to check S3 object: ${key}` }),
    }).pipe(
      Effect.withSpan('storage.exists', {
        attributes: {
          'storage.key': key,
          'storage.provider': 's3',
          'storage.bucket': config.bucket,
        },
      }),
    ),
});

export const S3StorageLive = (config: S3StorageConfig): Layer.Layer<Storage> =>
  Layer.succeed(Storage, makeS3Storage(config));
