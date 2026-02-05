import { Effect } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageNotFoundError } from '../errors';
import { DatabaseStorageLive } from '../providers/database';
import { Storage } from '../service';

// Skip: These are integration tests that require a database connection.
// Move to apps/server/__tests__ once integration testing is set up.
describe.skip('DatabaseStorage provider', () => {
  const runWithStorage = <A, E>(effect: Effect.Effect<A, E, Storage>) =>
    Effect.runPromise(Effect.provide(effect, DatabaseStorageLive));

  beforeEach(() => {
    // The database provider uses an in-memory Map, we need to clear it between tests
    // by uploading and deleting to simulate reset
  });

  describe('upload', () => {
    it('should store data and return a data URL', async () => {
      const result = await runWithStorage(
        Effect.gen(function* () {
          const storage = yield* Storage;
          return yield* storage.upload(
            'test-key',
            Buffer.from('Hello, World!'),
            'text/plain',
          );
        }),
      );

      expect(result).toBe('data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==');
    });

    it('should handle binary data', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff]);

      const result = await runWithStorage(
        Effect.gen(function* () {
          const storage = yield* Storage;
          return yield* storage.upload(
            'binary-key',
            binaryData,
            'application/octet-stream',
          );
        }),
      );

      expect(result).toContain('data:application/octet-stream;base64,');
    });
  });

  describe('download', () => {
    it('should retrieve previously uploaded data', async () => {
      const testData = Buffer.from('Test content');

      const result = await runWithStorage(
        Effect.gen(function* () {
          const storage = yield* Storage;
          yield* storage.upload('download-test', testData, 'text/plain');
          return yield* storage.download('download-test');
        }),
      );

      expect(result).toEqual(testData);
    });

    it('should fail with StorageNotFoundError for missing keys', async () => {
      const exit = await Effect.runPromiseExit(
        Effect.provide(
          Effect.gen(function* () {
            const storage = yield* Storage;
            return yield* storage.download('non-existent-key');
          }),
          DatabaseStorageLive,
        ),
      );

      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure') {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        expect(error).toBeInstanceOf(StorageNotFoundError);
        expect((error as StorageNotFoundError).key).toBe('non-existent-key');
      }
    });
  });

  describe('delete', () => {
    it('should remove stored data', async () => {
      const result = await runWithStorage(
        Effect.gen(function* () {
          const storage = yield* Storage;
          yield* storage.upload(
            'delete-test',
            Buffer.from('data'),
            'text/plain',
          );
          yield* storage.delete('delete-test');
          return yield* storage.exists('delete-test');
        }),
      );

      expect(result).toBe(false);
    });
  });

  describe('getUrl', () => {
    it('should return the data URL for existing data', async () => {
      const result = await runWithStorage(
        Effect.gen(function* () {
          const storage = yield* Storage;
          yield* storage.upload(
            'url-test',
            Buffer.from('content'),
            'text/plain',
          );
          return yield* storage.getUrl('url-test');
        }),
      );

      expect(result).toContain('data:text/plain;base64,');
    });

    it('should return empty string for non-existent key', async () => {
      const result = await runWithStorage(
        Effect.gen(function* () {
          const storage = yield* Storage;
          return yield* storage.getUrl('missing-key');
        }),
      );

      expect(result).toBe('');
    });
  });

  describe('exists', () => {
    it('should return true for existing keys', async () => {
      const result = await runWithStorage(
        Effect.gen(function* () {
          const storage = yield* Storage;
          yield* storage.upload(
            'exists-test',
            Buffer.from('data'),
            'text/plain',
          );
          return yield* storage.exists('exists-test');
        }),
      );

      expect(result).toBe(true);
    });

    it('should return false for non-existent keys', async () => {
      const result = await runWithStorage(
        Effect.gen(function* () {
          const storage = yield* Storage;
          return yield* storage.exists('does-not-exist');
        }),
      );

      expect(result).toBe(false);
    });
  });
});
