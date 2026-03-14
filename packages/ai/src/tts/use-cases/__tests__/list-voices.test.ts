import { layer } from '@effect/vitest';
import { Effect } from 'effect';
import { expect } from 'vitest';
import { createMockTTS } from '../../../testing/tts';
import { VOICES } from '../../voices';
import { listVoices } from '../list-voices';

// =============================================================================
// Tests
// =============================================================================

layer(createMockTTS({ voices: VOICES }))('listVoices', (it) => {
  it.effect('returns all available voices', () =>
    Effect.gen(function* () {
      const result = yield* listVoices({});
      expect(result.voices).toHaveLength(VOICES.length);
      expect(result.voices).toEqual(VOICES);
    }),
  );

  it.effect('returns only female voices when gender is female', () =>
    Effect.gen(function* () {
      const result = yield* listVoices({ gender: 'female' });
      expect(result.voices.length).toBeGreaterThan(0);
      expect(result.voices.every((v) => v.gender === 'female')).toBe(true);
    }),
  );

  it.effect('returns only male voices when gender is male', () =>
    Effect.gen(function* () {
      const result = yield* listVoices({ gender: 'male' });
      expect(result.voices.length).toBeGreaterThan(0);
      expect(result.voices.every((v) => v.gender === 'male')).toBe(true);
    }),
  );
});
