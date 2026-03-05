import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
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
  /** Public-facing endpoint for URL generation (e.g. browser-accessible MinIO URL). Falls back to endpoint. */
  readonly publicEndpoint?: string;
}

const makeS3Storage = (config: S3StorageConfig): StorageService => {
  const baseUrl =
    config.endpoint ?? `https://s3.${config.region}.amazonaws.com`;
  const publicBaseUrl = config.publicEndpoint ?? baseUrl;
  const s3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: Boolean(config.endpoint),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // Keep retries explicit in Effect call sites.
    maxAttempts: 1,
  });

  const publicUrl = (key: string) => `${publicBaseUrl}/${config.bucket}/${key}`;

  const spanAttributes = (key: string) => ({
    'storage.key': key,
    'storage.provider': 's3' as const,
    'storage.bucket': config.bucket,
  });

  const isS3NotFound = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;

    const name =
      'name' in error && typeof error.name === 'string'
        ? error.name
        : undefined;
    const code =
      'Code' in error && typeof error.Code === 'string'
        ? error.Code
        : undefined;
    const metadata =
      '$metadata' in error &&
      typeof error.$metadata === 'object' &&
      error.$metadata !== null
        ? error.$metadata
        : undefined;
    const statusCode =
      metadata &&
      'httpStatusCode' in metadata &&
      typeof metadata.httpStatusCode === 'number'
        ? metadata.httpStatusCode
        : undefined;

    return (
      name === 'NoSuchKey' ||
      name === 'NotFound' ||
      code === 'NoSuchKey' ||
      code === 'NotFound' ||
      statusCode === 404
    );
  };

  return {
    upload: (key, data, contentType) =>
      Effect.tryPromise({
        try: async () => {
          await s3Client.send(
            new PutObjectCommand({
              Bucket: config.bucket,
              Key: key,
              Body: data,
              ContentType: contentType,
            }),
          );

          return publicUrl(key);
        },
        catch: (cause) =>
          new StorageUploadError({
            key,
            message: `Failed to upload to S3: ${key}`,
            cause,
          }),
      }).pipe(
        Effect.withSpan('storage.upload', { attributes: spanAttributes(key) }),
      ),

    download: (key) =>
      Effect.gen(function* () {
        const output = yield* Effect.tryPromise({
          try: () =>
            s3Client.send(
              new GetObjectCommand({
                Bucket: config.bucket,
                Key: key,
              }),
            ),
          catch: (cause) => {
            if (isS3NotFound(cause)) {
              return new StorageNotFoundError({ key });
            }
            return new StorageError({
              message: `Failed to download from S3: ${key}`,
              cause,
            });
          },
        });

        if (!output.Body) {
          return yield* Effect.fail(
            new StorageError({
              message: `S3 download failed: empty body for ${key}`,
            }),
          );
        }

        const bytes = yield* Effect.tryPromise({
          try: () => output.Body!.transformToByteArray(),
          catch: (cause) =>
            new StorageError({
              message: `Failed to read S3 response: ${key}`,
              cause,
            }),
        });

        return Buffer.from(bytes);
      }).pipe(
        Effect.withSpan('storage.download', {
          attributes: spanAttributes(key),
        }),
      ),

    delete: (key) =>
      Effect.tryPromise({
        try: async () => {
          await s3Client.send(
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
        Effect.withSpan('storage.delete', { attributes: spanAttributes(key) }),
      ),

    getUrl: (key) =>
      Effect.succeed(publicUrl(key)).pipe(
        Effect.withSpan('storage.getUrl', { attributes: spanAttributes(key) }),
      ),

    exists: (key) =>
      Effect.tryPromise({
        try: async () => {
          try {
            await s3Client.send(
              new HeadObjectCommand({
                Bucket: config.bucket,
                Key: key,
              }),
            );
            return true;
          } catch (cause) {
            if (isS3NotFound(cause)) return false;
            throw cause;
          }
        },
        catch: (cause) =>
          new StorageError({
            message: `Failed to check S3 object: ${key}`,
            cause,
          }),
      }).pipe(
        Effect.withSpan('storage.exists', { attributes: spanAttributes(key) }),
      ),
  };
};

export const S3StorageLive = (config: S3StorageConfig): Layer.Layer<Storage> =>
  Layer.sync(Storage, () => makeS3Storage(config));
