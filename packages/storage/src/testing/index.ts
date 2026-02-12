import { Storage, type StorageService, StorageNotFoundError } from '..';
import { Layer, Effect } from 'effect';

export interface MockStorageOptions {
  delay?: number;
  baseUrl?: string;
}

/**
 * Create an in-memory storage layer for testing.
 * Data persists across calls within the same instance; call `clear()` between tests.
 */
export function createInMemoryStorage(options: MockStorageOptions = {}) {
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
    // eslint-disable-next-line no-restricted-syntax -- mock service with no Effect context requirements
    layer: Layer.succeed(Storage, service),
    clear: () => store.clear(),
    getStore: () => store,
  };
}

/**
 * Create a simple mock storage layer.
 * Unlike createInMemoryStorage, this does not persist data between calls.
 */
export function createMockStorage(
  options: MockStorageOptions = {},
): Layer.Layer<Storage> {
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

  // eslint-disable-next-line no-restricted-syntax -- mock service with no Effect context requirements
  return Layer.succeed(Storage, service);
}

export const MockStorageLive = createMockStorage();
