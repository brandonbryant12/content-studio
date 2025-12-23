import {
  Storage,
  type StorageService,
  StorageNotFoundError,
} from '@repo/storage';
import { Layer, Effect } from 'effect';

/**
 * Options for creating a mock storage service.
 */
export interface MockStorageOptions {
  /**
   * Simulated delay in milliseconds before returning.
   */
  delay?: number;

  /**
   * Base URL prefix for generated URLs.
   */
  baseUrl?: string;
}

/**
 * Create an in-memory storage layer for testing.
 * Data is stored in a Map and cleared between tests.
 *
 * @example
 * ```ts
 * const storage = createInMemoryStorage();
 *
 * await Effect.runPromise(
 *   Effect.gen(function* () {
 *     const s = yield* Storage;
 *     const url = yield* s.upload('test.txt', Buffer.from('hello'), 'text/plain');
 *     const data = yield* s.download('test.txt');
 *   }).pipe(Effect.provide(storage.layer))
 * );
 *
 * // Clear storage between tests
 * storage.clear();
 * ```
 */
export const createInMemoryStorage = (options: MockStorageOptions = {}) => {
  const store = new Map<string, { data: Buffer; contentType: string }>();
  const baseUrl = options.baseUrl ?? 'memory://';

  const service: StorageService = {
    upload: (key, data, contentType) =>
      Effect.gen(function* () {
        if (options.delay) {
          yield* Effect.sleep(options.delay);
        }
        store.set(key, { data, contentType });
        return `${baseUrl}${key}`;
      }),

    download: (key) =>
      Effect.gen(function* () {
        if (options.delay) {
          yield* Effect.sleep(options.delay);
        }
        const entry = store.get(key);
        if (!entry) {
          return yield* Effect.fail(new StorageNotFoundError({ key }));
        }
        return entry.data;
      }),

    delete: (key) =>
      Effect.gen(function* () {
        if (options.delay) {
          yield* Effect.sleep(options.delay);
        }
        store.delete(key);
      }),

    getUrl: (key) =>
      Effect.gen(function* () {
        if (options.delay) {
          yield* Effect.sleep(options.delay);
        }
        if (!store.has(key)) {
          return '';
        }
        return `${baseUrl}${key}`;
      }),

    exists: (key) =>
      Effect.gen(function* () {
        if (options.delay) {
          yield* Effect.sleep(options.delay);
        }
        return store.has(key);
      }),
  };

  return {
    layer: Layer.succeed(Storage, service),
    /**
     * Clear all stored data.
     */
    clear: () => store.clear(),
    /**
     * Get the raw store for inspection.
     */
    getStore: () => store,
  };
};

/**
 * Create a simple mock storage layer.
 * Unlike InMemoryStorage, this doesn't persist data between calls.
 */
export const createMockStorage = (
  options: MockStorageOptions = {},
): Layer.Layer<Storage> => {
  const baseUrl = options.baseUrl ?? 'mock://';

  const service: StorageService = {
    upload: (key) =>
      Effect.gen(function* () {
        if (options.delay) {
          yield* Effect.sleep(options.delay);
        }
        return `${baseUrl}${key}`;
      }),

    download: () =>
      Effect.gen(function* () {
        if (options.delay) {
          yield* Effect.sleep(options.delay);
        }
        return Buffer.from('mock content');
      }),

    delete: () =>
      Effect.gen(function* () {
        if (options.delay) {
          yield* Effect.sleep(options.delay);
        }
      }),

    getUrl: (key) =>
      Effect.gen(function* () {
        if (options.delay) {
          yield* Effect.sleep(options.delay);
        }
        return `${baseUrl}${key}`;
      }),

    exists: () =>
      Effect.gen(function* () {
        if (options.delay) {
          yield* Effect.sleep(options.delay);
        }
        return true;
      }),
  };

  return Layer.succeed(Storage, service);
};

/**
 * Default mock storage layer.
 */
export const MockStorageLive = createMockStorage();
