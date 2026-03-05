import { S3Client } from '@aws-sdk/client-s3';
import { Cause, Effect, Exit, Option } from 'effect';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { S3StorageLive, Storage, type S3StorageConfig } from '../index';

const TEST_CONFIG: S3StorageConfig = {
  bucket: 'content-studio',
  region: 'us-east-1',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
  endpoint: 'http://minio:9001',
  publicEndpoint: 'http://localhost:9001',
};

const layer = S3StorageLive(TEST_CONFIG);

const getFailure = (exit: Exit.Exit<unknown, unknown>): unknown => {
  if (Exit.isSuccess(exit)) return undefined;
  return Option.getOrUndefined(Cause.failureOption(exit.cause));
};

describe('S3StorageLive', () => {
  beforeEach(() => {
    vi.spyOn(S3Client.prototype, 'send');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uploads with PutObjectCommand and returns public URL', async () => {
    const sendSpy = vi.mocked(S3Client.prototype.send);
    sendSpy.mockResolvedValueOnce({});

    const url = await Effect.runPromise(
      Effect.gen(function* () {
        const storage = yield* Storage;
        return yield* storage.upload(
          'podcasts/pod_1/audio.wav',
          Buffer.from('audio'),
          'audio/wav',
        );
      }).pipe(Effect.provide(layer)),
    );

    expect(url).toBe(
      'http://localhost:9001/content-studio/podcasts/pod_1/audio.wav',
    );
    expect(sendSpy).toHaveBeenCalledTimes(1);

    const command = sendSpy.mock.calls[0]?.[0];
    expect(command?.constructor.name).toBe('PutObjectCommand');
    expect((command as { input: unknown }).input).toMatchObject({
      Bucket: 'content-studio',
      Key: 'podcasts/pod_1/audio.wav',
      ContentType: 'audio/wav',
    });
  });

  it('downloads with GetObjectCommand', async () => {
    const sendSpy = vi.mocked(S3Client.prototype.send);
    sendSpy.mockResolvedValueOnce({
      Body: {
        transformToByteArray: async () => Uint8Array.from([104, 105]),
      },
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const storage = yield* Storage;
        return yield* storage.download('voiceovers/vo_1/audio.wav');
      }).pipe(Effect.provide(layer)),
    );

    expect(result.toString('utf8')).toBe('hi');
    const command = sendSpy.mock.calls[0]?.[0];
    expect(command?.constructor.name).toBe('GetObjectCommand');
    expect((command as { input: unknown }).input).toMatchObject({
      Bucket: 'content-studio',
      Key: 'voiceovers/vo_1/audio.wav',
    });
  });

  it('maps not-found downloads to StorageNotFoundError', async () => {
    const sendSpy = vi.mocked(S3Client.prototype.send);
    sendSpy.mockRejectedValueOnce(
      Object.assign(new Error('Missing object'), {
        name: 'NoSuchKey',
        $metadata: { httpStatusCode: 404 },
      }),
    );

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const storage = yield* Storage;
        return yield* storage.download('missing.wav');
      }).pipe(Effect.provide(layer)),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    const failure = getFailure(exit) as
      | { _tag?: string; key?: string }
      | undefined;
    expect(failure?._tag).toBe('StorageNotFoundError');
    expect(failure?.key).toBe('missing.wav');
  });

  it('returns false from exists when object is missing', async () => {
    const sendSpy = vi.mocked(S3Client.prototype.send);
    sendSpy.mockRejectedValueOnce(
      Object.assign(new Error('Not found'), {
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 },
      }),
    );

    const exists = await Effect.runPromise(
      Effect.gen(function* () {
        const storage = yield* Storage;
        return yield* storage.exists('missing.txt');
      }).pipe(Effect.provide(layer)),
    );

    expect(exists).toBe(false);
    const command = sendSpy.mock.calls[0]?.[0];
    expect(command?.constructor.name).toBe('HeadObjectCommand');
  });

  it('deletes with DeleteObjectCommand and does not use raw fetch', async () => {
    const sendSpy = vi.mocked(S3Client.prototype.send);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    sendSpy.mockResolvedValueOnce({});

    await Effect.runPromise(
      Effect.gen(function* () {
        const storage = yield* Storage;
        yield* storage.delete('infographics/v1.png');
      }).pipe(Effect.provide(layer)),
    );

    const command = sendSpy.mock.calls[0]?.[0];
    expect(command?.constructor.name).toBe('DeleteObjectCommand');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
