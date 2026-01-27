import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
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

const makeS3Storage = (config: S3StorageConfig): StorageService => {
  const client = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: true, // Required for MinIO and other S3-compatible services
  });

  const getUrl = (key: string) => {
    const endpoint =
      config.endpoint ?? `https://s3.${config.region}.amazonaws.com`;
    return `${endpoint}/${config.bucket}/${key}`;
  };

  return {
    upload: (key, data, contentType) =>
      Effect.tryPromise({
        try: async () => {
          await client.send(
            new PutObjectCommand({
              Bucket: config.bucket,
              Key: key,
              Body: data,
              ContentType: contentType,
            }),
          );
          return getUrl(key);
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
          const response = await client.send(
            new GetObjectCommand({
              Bucket: config.bucket,
              Key: key,
            }),
          );

          const stream = response.Body;
          if (!stream) {
            throw new Error('Empty response body');
          }

          // Convert stream to buffer
          const chunks: Uint8Array[] = [];
          for await (const chunk of stream as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
          }
          return Buffer.concat(chunks);
        },
        catch: (cause) => {
          // Check for NoSuchKey error
          if (
            cause &&
            typeof cause === 'object' &&
            'name' in cause &&
            cause.name === 'NoSuchKey'
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
          await client.send(
            new DeleteObjectCommand({
              Bucket: config.bucket,
              Key: key,
            }),
          );
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
      Effect.succeed(getUrl(key)).pipe(
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
          await client.send(
            new HeadObjectCommand({
              Bucket: config.bucket,
              Key: key,
            }),
          );
          return true;
        },
        catch: (cause) => {
          // NotFound means the object doesn't exist
          if (
            cause &&
            typeof cause === 'object' &&
            'name' in cause &&
            (cause.name === 'NotFound' || cause.name === 'NoSuchKey')
          ) {
            return false;
          }
          throw cause;
        },
      }).pipe(
        Effect.catchAll(() => Effect.succeed(false)),
        Effect.withSpan('storage.exists', {
          attributes: {
            'storage.key': key,
            'storage.provider': 's3',
            'storage.bucket': config.bucket,
          },
        }),
      ),
  };
};

export const S3StorageLive = (config: S3StorageConfig): Layer.Layer<Storage> =>
  Layer.succeed(Storage, makeS3Storage(config));
