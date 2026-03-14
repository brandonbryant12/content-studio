import { it } from '@effect/vitest';
import { Storage, StorageError, type StorageService } from '@repo/storage';
import { createInMemoryStorage } from '@repo/storage/testing';
import { Effect, Layer } from 'effect';
import { describe, expect } from 'vitest';
import { expectTaggedFailure } from '../../../testing/assertions';
import { createMockTTS } from '../../../testing/tts';
import { VOICES } from '../../voices';
import { listVoicesWithPreviews } from '../list-voices-with-previews';

const createPreviewStorageLayer = () => {
  const storage = createInMemoryStorage({
    baseUrl: 'https://storage.example.com/',
  });

  storage.getStore().set('voice-previews/Charon.wav', {
    data: Buffer.from('charon-preview'),
    contentType: 'audio/wav',
  });
  storage.getStore().set('voice-previews/Kore.wav', {
    data: Buffer.from('kore-preview'),
    contentType: 'audio/wav',
  });

  return storage.layer;
};

describe('listVoicesWithPreviews', () => {
  it.effect(
    'returns all voices with null previewUrl when no previews exist',
    () =>
      Effect.gen(function* () {
        const result = yield* listVoicesWithPreviews({});

        expect(result).toHaveLength(VOICES.length);
        expect(result.every((voice) => voice.previewUrl === null)).toBe(true);
      }).pipe(
        Effect.provide(
          Layer.merge(
            createMockTTS({ voices: VOICES }),
            createInMemoryStorage({ baseUrl: 'https://storage.example.com/' })
              .layer,
          ),
        ),
      ),
  );

  it.effect('returns preview URLs for voices that have preview files', () =>
    Effect.gen(function* () {
      const result = yield* listVoicesWithPreviews({});

      const charon = result.find((voice) => voice.id === 'Charon');
      expect(charon?.previewUrl).toBe(
        'https://storage.example.com/voice-previews/Charon.wav',
      );

      const kore = result.find((voice) => voice.id === 'Kore');
      expect(kore?.previewUrl).toBe(
        'https://storage.example.com/voice-previews/Kore.wav',
      );

      const aoede = result.find((voice) => voice.id === 'Aoede');
      expect(aoede?.previewUrl).toBeNull();
    }).pipe(
      Effect.provide(
        Layer.merge(
          createMockTTS({ voices: VOICES }),
          createPreviewStorageLayer(),
        ),
      ),
    ),
  );

  it.effect('applies gender filter', () =>
    Effect.gen(function* () {
      const result = yield* listVoicesWithPreviews({ gender: 'female' });

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((voice) => voice.gender === 'female')).toBe(true);
    }).pipe(
      Effect.provide(
        Layer.merge(
          createMockTTS({ voices: VOICES }),
          createInMemoryStorage({ baseUrl: 'https://storage.example.com/' })
            .layer,
        ),
      ),
    ),
  );

  it.effect(
    'fails when storage errors occur during preview metadata lookup',
    () =>
      Effect.gen(function* () {
        const exit = yield* listVoicesWithPreviews({}).pipe(Effect.exit);
        const error = expectTaggedFailure(exit, 'StorageError');

        expect(error.message).toBe('Connection failed');
      }).pipe(
        Effect.provide(
          Layer.merge(
            createMockTTS({ voices: VOICES }),
            Layer.succeed(Storage, {
              upload: () => Effect.succeed('https://storage.example.com/mock'),
              download: () => Effect.succeed(Buffer.from('unused')),
              delete: () => Effect.void,
              exists: () =>
                Effect.fail(new StorageError({ message: 'Connection failed' })),
              getUrl: () =>
                Effect.succeed('https://storage.example.com/unused'),
            } satisfies StorageService),
          ),
        ),
      ),
  );
});
