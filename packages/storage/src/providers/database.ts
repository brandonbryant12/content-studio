import { eq } from '@repo/db';
import { storageBlob } from '@repo/db/schema';
import { Db } from '@repo/effect/db';
import { Effect, Layer } from 'effect';
import { StorageError, StorageNotFoundError, StorageUploadError } from '../errors';
import { Storage, type StorageService } from '../service';

/**
 * Live layer for database-backed storage.
 * Stores blobs in the storage_blob table for persistence across processes.
 *
 * Uses Layer.effect to capture Db dependency at layer construction time.
 * This ensures compile-time verification that Db is provided.
 */
export const DatabaseStorageLive: Layer.Layer<Storage, never, Db> = Layer.effect(
  Storage,
  Effect.gen(function* () {
    // Capture database at layer construction time
    const { db } = yield* Db;

    const service: StorageService = {
      upload: (key, data, contentType) =>
        Effect.tryPromise({
          try: async () => {
            // Upsert: insert or update if key exists
            await db
              .insert(storageBlob)
              .values({
                key,
                data,
                contentType,
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: storageBlob.key,
                set: {
                  data,
                  contentType,
                  updatedAt: new Date(),
                },
              });

            // Return data URL for small files, otherwise just the key
            if (data.length < 1024 * 1024) {
              // < 1MB
              const base64 = data.toString('base64');
              return `data:${contentType};base64,${base64}`;
            }
            return key;
          },
          catch: (cause) =>
            new StorageUploadError({
              key,
              message: `Failed to upload: ${cause instanceof Error ? cause.message : String(cause)}`,
              cause,
            }),
        }).pipe(
          Effect.withSpan('storage.upload', {
            attributes: { 'storage.key': key, 'storage.provider': 'database' },
          }),
        ),

      download: (key) =>
        Effect.tryPromise({
          try: async () => {
            const result = await db
              .select({ data: storageBlob.data })
              .from(storageBlob)
              .where(eq(storageBlob.key, key))
              .limit(1);

            return result[0] ?? null;
          },
          catch: (cause) =>
            new StorageError({
              message: `Failed to download: ${cause instanceof Error ? cause.message : String(cause)}`,
              cause,
            }),
        }).pipe(
          Effect.flatMap((result) =>
            result
              ? Effect.succeed(Buffer.from(result.data))
              : Effect.fail(new StorageNotFoundError({ key })),
          ),
          Effect.withSpan('storage.download', {
            attributes: { 'storage.key': key, 'storage.provider': 'database' },
          }),
        ),

      delete: (key) =>
        Effect.tryPromise({
          try: async () => {
            await db.delete(storageBlob).where(eq(storageBlob.key, key));
          },
          catch: (cause) =>
            new StorageError({
              message: `Failed to delete: ${cause instanceof Error ? cause.message : String(cause)}`,
              cause,
            }),
        }).pipe(
          Effect.withSpan('storage.delete', {
            attributes: { 'storage.key': key, 'storage.provider': 'database' },
          }),
        ),

      getUrl: (key) =>
        Effect.tryPromise({
          try: async () => {
            const result = await db
              .select({ data: storageBlob.data, contentType: storageBlob.contentType })
              .from(storageBlob)
              .where(eq(storageBlob.key, key))
              .limit(1);

            if (!result[0]) return '';

            const base64 = Buffer.from(result[0].data).toString('base64');
            return `data:${result[0].contentType};base64,${base64}`;
          },
          catch: (cause) =>
            new StorageError({
              message: `Failed to get URL: ${cause instanceof Error ? cause.message : String(cause)}`,
              cause,
            }),
        }).pipe(
          Effect.withSpan('storage.getUrl', {
            attributes: { 'storage.key': key, 'storage.provider': 'database' },
          }),
        ),

      exists: (key) =>
        Effect.tryPromise({
          try: async () => {
            const result = await db
              .select({ key: storageBlob.key })
              .from(storageBlob)
              .where(eq(storageBlob.key, key))
              .limit(1);

            return result.length > 0;
          },
          catch: (cause) =>
            new StorageError({
              message: `Failed to check existence: ${cause instanceof Error ? cause.message : String(cause)}`,
              cause,
            }),
        }).pipe(
          Effect.withSpan('storage.exists', {
            attributes: { 'storage.key': key, 'storage.provider': 'database' },
          }),
        ),
    };

    return service;
  }),
);
