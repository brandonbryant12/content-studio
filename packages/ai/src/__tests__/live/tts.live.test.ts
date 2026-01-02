/**
 * Live integration tests for TTS (Google Gemini) service.
 *
 * These tests are SKIPPED by default and only run when GEMINI_API_KEY is set.
 * Use them to verify:
 * - Service configuration before deployment
 * - API connectivity and credentials
 * - Real audio generation and format validation
 *
 * Run with: GEMINI_API_KEY=xxx pnpm --filter @repo/ai test:live:tts
 */
import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { GoogleTTSLive, TTS } from '../../tts';
import { VOICES, FEMALE_VOICES, MALE_VOICES } from '../../tts/voices';
import { TTSError, TTSQuotaExceededError } from '../../errors';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

describe.skipIf(!GEMINI_API_KEY)('TTS Live Integration', () => {
  const layer = GoogleTTSLive({ apiKey: GEMINI_API_KEY! });

  describe('listVoices', () => {
    it('can list available voices', async () => {
      const effect = Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.listVoices();
      }).pipe(Effect.provide(layer));

      const voices = await Effect.runPromise(effect);

      expect(voices.length).toBe(VOICES.length);
      expect(voices.length).toBe(FEMALE_VOICES.length + MALE_VOICES.length);
    });

    it('can filter voices by gender', async () => {
      const effect = Effect.gen(function* () {
        const tts = yield* TTS;
        return {
          female: yield* tts.listVoices({ gender: 'female' }),
          male: yield* tts.listVoices({ gender: 'male' }),
        };
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(effect);

      expect(result.female.length).toBe(FEMALE_VOICES.length);
      expect(result.male.length).toBe(MALE_VOICES.length);

      // Verify all female voices are actually female
      for (const voice of result.female) {
        expect(voice.gender).toBe('female');
      }

      // Verify all male voices are actually male
      for (const voice of result.male) {
        expect(voice.gender).toBe('male');
      }
    });
  });

  describe('previewVoice', () => {
    it('can generate audio from text', async () => {
      const effect = Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.previewVoice({
          voiceId: 'Charon',
          text: 'Hello, this is a test.',
        });
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(effect);

      expect(result.audioContent).toBeInstanceOf(Buffer);
      expect(result.audioContent.length).toBeGreaterThan(0);
      expect(result.voiceId).toBe('Charon');
      expect(result.audioEncoding).toBeDefined();
    });

    it('returns valid audio format (WAV/LINEAR16)', async () => {
      const effect = Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.previewVoice({
          voiceId: 'Kore',
          text: 'Testing audio format.',
          audioEncoding: 'LINEAR16',
        });
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(effect);

      expect(result.audioEncoding).toBe('LINEAR16');
      expect(result.audioContent.length).toBeGreaterThan(0);

      // WAV files should start with RIFF header
      const header = result.audioContent.slice(0, 4).toString('ascii');
      expect(header).toBe('RIFF');
    });

    it('returns valid audio format (MP3)', async () => {
      const effect = Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.previewVoice({
          voiceId: 'Puck',
          text: 'Testing MP3 format.',
          audioEncoding: 'MP3',
        });
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(effect);

      expect(result.audioEncoding).toBe('MP3');
      expect(result.audioContent.length).toBeGreaterThan(0);

      // MP3 files typically start with ID3 tag or frame sync
      const firstByte = result.audioContent[0] ?? 0;
      const secondByte = result.audioContent[1] ?? 0;
      const thirdByte = result.audioContent[2] ?? 0;

      // Either starts with ID3 tag or frame sync (0xFF 0xFB/0xFA/0xF3/etc)
      const hasId3Tag =
        firstByte === 0x49 && secondByte === 0x44 && thirdByte === 0x33; // "ID3"
      const hasFrameSync = firstByte === 0xff && (secondByte & 0xe0) === 0xe0;

      expect(hasId3Tag || hasFrameSync).toBe(true);
    });

    it('can preview multiple different voices', async () => {
      const voicesToTest = ['Charon', 'Kore', 'Fenrir', 'Aoede'] as const;

      const effect = Effect.gen(function* () {
        const tts = yield* TTS;
        const results = [];

        for (const voiceId of voicesToTest) {
          const result = yield* tts.previewVoice({
            voiceId,
            text: `Hello from ${voiceId}.`,
          });
          results.push(result);
        }

        return results;
      }).pipe(Effect.provide(layer));

      const results = await Effect.runPromise(effect);

      expect(results.length).toBe(voicesToTest.length);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const voice = voicesToTest[i];
        expect(result?.voiceId).toBe(voice);
        expect(result?.audioContent.length).toBeGreaterThan(0);
      }
    });
  });

  describe('synthesize', () => {
    it('can synthesize multi-speaker audio', async () => {
      const effect = Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.synthesize({
          turns: [
            { speaker: 'host', text: 'Welcome to the show!' },
            { speaker: 'guest', text: 'Thanks for having me.' },
            { speaker: 'host', text: 'Let us get started.' },
          ],
          voiceConfigs: [
            { speakerAlias: 'host', voiceId: 'Charon' },
            { speakerAlias: 'guest', voiceId: 'Kore' },
          ],
        });
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(effect);

      expect(result.audioContent).toBeInstanceOf(Buffer);
      expect(result.audioContent.length).toBeGreaterThan(0);
      expect(result.audioEncoding).toBeDefined();
      expect(result.mimeType).toBeDefined();
    });

    it('supports different audio encodings for synthesis', async () => {
      const effect = Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.synthesize({
          turns: [{ speaker: 'narrator', text: 'Testing audio format.' }],
          voiceConfigs: [{ speakerAlias: 'narrator', voiceId: 'Alnilam' }],
          audioEncoding: 'LINEAR16',
        });
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(effect);

      expect(result.audioContent.length).toBeGreaterThan(0);
      // WAV files should start with RIFF header
      const header = result.audioContent.slice(0, 4).toString('ascii');
      expect(header).toBe('RIFF');
    });
  });

  describe('error handling', () => {
    it('handles invalid API key', async () => {
      const invalidLayer = GoogleTTSLive({ apiKey: 'invalid-api-key' });

      const effect = Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.previewVoice({
          voiceId: 'Charon',
          text: 'Test',
        });
      }).pipe(Effect.provide(invalidLayer));

      const result = await Effect.runPromiseExit(effect);

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause;
        expect(error._tag).toBe('Fail');
        if (error._tag === 'Fail') {
          expect(
            error.error instanceof TTSError ||
              error.error instanceof TTSQuotaExceededError,
          ).toBe(true);
        }
      }
    });
  });
});

describe.skipIf(!GEMINI_API_KEY)('TTS Live Integration - Rate Limiting', () => {
  // Note: Rate limiting tests are harder to trigger reliably
  // Included for manual verification when debugging quota issues

  it.skip('handles rate limiting gracefully', async () => {
    const layer = GoogleTTSLive({ apiKey: GEMINI_API_KEY! });

    // Send many requests in parallel to potentially trigger rate limiting
    const effects = Array.from({ length: 20 }, () =>
      Effect.gen(function* () {
        const tts = yield* TTS;
        return yield* tts.previewVoice({
          voiceId: 'Charon',
          text: 'Rate limit test',
        });
      }).pipe(Effect.provide(layer)),
    );

    const results = await Promise.allSettled(
      effects.map((e) => Effect.runPromise(e)),
    );

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes.length).toBeGreaterThan(0);

    // If there are failures, they should be quota/rate limit errors
    for (const failure of failures) {
      if (failure.status === 'rejected') {
        expect(failure.reason).toBeInstanceOf(TTSQuotaExceededError);
      }
    }
  });
});
