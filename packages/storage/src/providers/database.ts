import { Effect, Layer } from 'effect';
import { StorageNotFoundError } from '../errors';
import { Storage, type StorageService } from '../service';

const store = new Map<string, { data: Buffer; contentType: string }>();

const makeDatabaseStorage = (): StorageService => ({
  upload: (key, data, contentType) =>
    Effect.sync(() => {
      store.set(key, { data, contentType });
      const base64 = data.toString('base64');
      return `data:${contentType};base64,${base64}`;
    }).pipe(Effect.withSpan('storage.upload', { attributes: { 'storage.key': key, 'storage.provider': 'database' } })),

  download: (key) =>
    Effect.sync(() => store.get(key)).pipe(
      Effect.flatMap((entry) =>
        entry
          ? Effect.succeed(entry.data)
          : Effect.fail(new StorageNotFoundError({ key })),
      ),
      Effect.withSpan('storage.download', { attributes: { 'storage.key': key, 'storage.provider': 'database' } }),
    ),

  delete: (key) =>
    Effect.sync(() => {
      store.delete(key);
    }).pipe(Effect.withSpan('storage.delete', { attributes: { 'storage.key': key, 'storage.provider': 'database' } })),

  getUrl: (key) =>
    Effect.sync(() => store.get(key)).pipe(
      Effect.map((entry) => {
        if (!entry) return '';
        const base64 = entry.data.toString('base64');
        return `data:${entry.contentType};base64,${base64}`;
      }),
      Effect.withSpan('storage.getUrl', { attributes: { 'storage.key': key, 'storage.provider': 'database' } }),
    ),

  exists: (key) =>
    Effect.sync(() => store.has(key)).pipe(
      Effect.withSpan('storage.exists', { attributes: { 'storage.key': key, 'storage.provider': 'database' } }),
    ),
});

export const DatabaseStorageLive: Layer.Layer<Storage> = Layer.succeed(
  Storage,
  makeDatabaseStorage(),
);
