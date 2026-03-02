import { it } from '@effect/vitest';
import { Storage, StorageError, type StorageService } from '@repo/storage';
import { Effect, Layer } from 'effect';
import { describe, expect } from 'vitest';
import { TTS, type TTSService, VOICES } from '../../index';
import { listVoicesWithPreviews } from '../list-voices-with-previews';

// =============================================================================
// Mock Services
// =============================================================================

const createMockTTSService = (): TTSService => ({
  listVoices: (options) =>
    Effect.succeed(
      options?.gender
        ? VOICES.filter((v) => v.gender === options.gender)
        : VOICES,
    ),
  previewVoice: () => Effect.die('Not implemented in mock'),
  synthesize: () => Effect.die('Not implemented in mock'),
});

const createMockStorageService = (
  existingKeys: Set<string> = new Set(),
): StorageService => ({
  upload: () => Effect.die('Not implemented in mock'),
  download: () => Effect.die('Not implemented in mock'),
  delete: () => Effect.die('Not implemented in mock'),
  exists: (key) => Effect.succeed(existingKeys.has(key)),
  getUrl: (key) => Effect.succeed(`https://storage.example.com/${key}`),
});

// =============================================================================
// Tests
// =============================================================================

describe('listVoicesWithPreviews', () => {
  it.effect(
    'returns all voices with null previewUrl when no previews exist',
    () =>
      Effect.gen(function* () {
        const result = yield* listVoicesWithPreviews({});

        expect(result).toHaveLength(VOICES.length);
        expect(result.every((v) => v.previewUrl === null)).toBe(true);
      }).pipe(
        Effect.provide(
          Layer.merge(
            Layer.succeed(TTS, createMockTTSService()),
            Layer.succeed(Storage, createMockStorageService()),
          ),
        ),
      ),
  );

  it.effect('returns preview URLs for voices that have preview files', () =>
    Effect.gen(function* () {
      const result = yield* listVoicesWithPreviews({});

      const charon = result.find((v) => v.id === 'Charon');
      expect(charon?.previewUrl).toBe(
        'https://storage.example.com/voice-previews/Charon.wav',
      );

      const kore = result.find((v) => v.id === 'Kore');
      expect(kore?.previewUrl).toBe(
        'https://storage.example.com/voice-previews/Kore.wav',
      );

      // Voices without previews should have null
      const aoede = result.find((v) => v.id === 'Aoede');
      expect(aoede?.previewUrl).toBeNull();
    }).pipe(
      Effect.provide(
        Layer.merge(
          Layer.succeed(TTS, createMockTTSService()),
          Layer.succeed(
            Storage,
            createMockStorageService(
              new Set(['voice-previews/Charon.wav', 'voice-previews/Kore.wav']),
            ),
          ),
        ),
      ),
    ),
  );

  it.effect('applies gender filter', () =>
    Effect.gen(function* () {
      const result = yield* listVoicesWithPreviews({ gender: 'female' });

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((v) => v.gender === 'female')).toBe(true);
    }).pipe(
      Effect.provide(
        Layer.merge(
          Layer.succeed(TTS, createMockTTSService()),
          Layer.succeed(Storage, createMockStorageService()),
        ),
      ),
    ),
  );

  it.effect(
    'fails when storage errors occur during preview metadata lookup',
    () =>
      Effect.gen(function* () {
        const result = yield* listVoicesWithPreviews({}).pipe(Effect.either);

        expect(result._tag).toBe('Left');
        if (result._tag === 'Left') {
          expect(result.left._tag).toBe('StorageError');
          expect((result.left as StorageError).message).toBe(
            'Connection failed',
          );
        }
      }).pipe(
        Effect.provide(
          Layer.merge(
            Layer.succeed(TTS, createMockTTSService()),
            Layer.succeed(Storage, {
              upload: () => Effect.die('Not implemented'),
              download: () => Effect.die('Not implemented'),
              delete: () => Effect.die('Not implemented'),
              exists: () =>
                Effect.fail(new StorageError({ message: 'Connection failed' })),
              getUrl: () => Effect.die('Not implemented'),
            }),
          ),
        ),
      ),
  );
});
