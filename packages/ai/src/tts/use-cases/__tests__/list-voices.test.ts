import { Effect, Layer } from 'effect';
import { describe, it, expect } from 'vitest';
import { TTS, type TTSService, VOICES } from '../../index';
import { listVoices } from '../list-voices';

// =============================================================================
// Mock TTS Service
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

const MockTTSLayer: Layer.Layer<TTS> = Layer.succeed(
  TTS,
  createMockTTSService(),
);

// =============================================================================
// Tests
// =============================================================================

describe('listVoices', () => {
  describe('without filter', () => {
    it('returns all available voices', async () => {
      const effect = listVoices({}).pipe(Effect.provide(MockTTSLayer));

      const result = await Effect.runPromise(effect);

      expect(result.voices).toHaveLength(VOICES.length);
      expect(result.voices).toEqual(VOICES);
    });
  });

  describe('with gender filter', () => {
    it('returns only female voices when gender is female', async () => {
      const effect = listVoices({ gender: 'female' }).pipe(
        Effect.provide(MockTTSLayer),
      );

      const result = await Effect.runPromise(effect);

      expect(result.voices.length).toBeGreaterThan(0);
      expect(result.voices.every((v) => v.gender === 'female')).toBe(true);
    });

    it('returns only male voices when gender is male', async () => {
      const effect = listVoices({ gender: 'male' }).pipe(
        Effect.provide(MockTTSLayer),
      );

      const result = await Effect.runPromise(effect);

      expect(result.voices.length).toBeGreaterThan(0);
      expect(result.voices.every((v) => v.gender === 'male')).toBe(true);
    });
  });

  describe('voice data structure', () => {
    it('returns voices with expected properties', async () => {
      const effect = listVoices({}).pipe(Effect.provide(MockTTSLayer));

      const result = await Effect.runPromise(effect);

      const firstVoice = result.voices[0]!;
      expect(firstVoice).toHaveProperty('id');
      expect(firstVoice).toHaveProperty('name');
      expect(firstVoice).toHaveProperty('gender');
      expect(firstVoice).toHaveProperty('description');
      expect(typeof firstVoice.id).toBe('string');
      expect(typeof firstVoice.name).toBe('string');
      expect(['male', 'female']).toContain(firstVoice.gender);
      expect(typeof firstVoice.description).toBe('string');
    });
  });
});
