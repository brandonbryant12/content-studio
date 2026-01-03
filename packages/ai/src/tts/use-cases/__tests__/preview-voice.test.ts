import { Effect, Layer, Exit } from 'effect';
import { describe, it, expect } from 'vitest';
import {
  TTSError,
  TTSQuotaExceededError,
  VoiceNotFoundError,
} from '../../../errors';
import {
  TTS,
  type TTSService,
  type PreviewVoiceResult,
  type GeminiVoiceId,
} from '../../index';
import { previewVoice } from '../preview-voice';

// =============================================================================
// Mock TTS Service
// =============================================================================

interface MockConfig {
  shouldFail?: 'tts-error' | 'quota-exceeded';
  previewResult?: PreviewVoiceResult;
}

const createMockTTSService = (config: MockConfig = {}): TTSService => ({
  listVoices: () => Effect.die('Not implemented in mock'),

  previewVoice: (options) => {
    if (config.shouldFail === 'tts-error') {
      return Effect.fail(new TTSError({ message: 'TTS service unavailable' }));
    }
    if (config.shouldFail === 'quota-exceeded') {
      return Effect.fail(
        new TTSQuotaExceededError({ message: 'Quota exceeded' }),
      );
    }
    return Effect.succeed(
      config.previewResult ?? {
        audioContent: Buffer.from('test audio content'),
        audioEncoding: 'MP3' as const,
        voiceId: options.voiceId,
      },
    );
  },

  synthesize: () => Effect.die('Not implemented in mock'),
});

const createMockTTSLayer = (config: MockConfig = {}): Layer.Layer<TTS> =>
  Layer.succeed(TTS, createMockTTSService(config));

// =============================================================================
// Tests
// =============================================================================

describe('previewVoice', () => {
  describe('successful preview', () => {
    it('generates audio preview for valid voice ID', async () => {
      const layer = createMockTTSLayer();
      const effect = previewVoice({ voiceId: 'Charon' }).pipe(
        Effect.provide(layer),
      );

      const result = await Effect.runPromise(effect);

      expect(result.voiceId).toBe('Charon');
      expect(result.audioEncoding).toBe('MP3');
      expect(Buffer.isBuffer(result.audioContent)).toBe(true);
    });

    it('passes custom text to TTS service', async () => {
      const customText = 'Custom preview text';
      const layer = createMockTTSLayer();
      const effect = previewVoice({
        voiceId: 'Kore',
        text: customText,
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(effect);

      expect(result.voiceId).toBe('Kore');
    });

    it('passes audio encoding option to TTS service', async () => {
      const layer = createMockTTSLayer({
        previewResult: {
          audioContent: Buffer.from('ogg audio'),
          audioEncoding: 'OGG_OPUS',
          voiceId: 'Charon' as GeminiVoiceId,
        },
      });

      const effect = previewVoice({
        voiceId: 'Charon',
        audioEncoding: 'OGG_OPUS',
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(effect);

      expect(result.audioEncoding).toBe('OGG_OPUS');
    });
  });

  describe('voice validation', () => {
    it('fails with VoiceNotFoundError for invalid voice ID', async () => {
      const layer = createMockTTSLayer();
      const effect = previewVoice({ voiceId: 'InvalidVoice' }).pipe(
        Effect.provide(layer),
      );

      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause;
        expect(error._tag).toBe('Fail');
        if (error._tag === 'Fail') {
          expect(error.error).toBeInstanceOf(VoiceNotFoundError);
          expect((error.error as VoiceNotFoundError).voiceId).toBe(
            'InvalidVoice',
          );
        }
      }
    });

    it('VoiceNotFoundError has correct HTTP protocol properties', () => {
      const error = new VoiceNotFoundError({ voiceId: 'BadVoice' });

      expect(VoiceNotFoundError.httpStatus).toBe(404);
      expect(VoiceNotFoundError.httpCode).toBe('VOICE_NOT_FOUND');
      expect(VoiceNotFoundError.logLevel).toBe('silent');
      expect(VoiceNotFoundError.httpMessage(error)).toBe(
        'Voice "BadVoice" not found',
      );
      expect(VoiceNotFoundError.getData(error)).toEqual({
        voiceId: 'BadVoice',
      });
    });

    it('VoiceNotFoundError uses custom message when provided', () => {
      const error = new VoiceNotFoundError({
        voiceId: 'BadVoice',
        message: 'Custom error message',
      });

      expect(VoiceNotFoundError.httpMessage(error)).toBe(
        'Custom error message',
      );
    });
  });

  describe('TTS service errors', () => {
    it('propagates TTSError from service', async () => {
      const layer = createMockTTSLayer({ shouldFail: 'tts-error' });
      const effect = previewVoice({ voiceId: 'Charon' }).pipe(
        Effect.provide(layer),
      );

      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause;
        expect(error._tag).toBe('Fail');
        if (error._tag === 'Fail') {
          expect(error.error).toBeInstanceOf(TTSError);
        }
      }
    });

    it('propagates TTSQuotaExceededError from service', async () => {
      const layer = createMockTTSLayer({ shouldFail: 'quota-exceeded' });
      const effect = previewVoice({ voiceId: 'Charon' }).pipe(
        Effect.provide(layer),
      );

      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause;
        expect(error._tag).toBe('Fail');
        if (error._tag === 'Fail') {
          expect(error.error).toBeInstanceOf(TTSQuotaExceededError);
        }
      }
    });
  });

  describe('all valid voice IDs', () => {
    const validVoiceIds = [
      'Achernar',
      'Aoede',
      'Charon',
      'Kore',
      'Zephyr',
      'Zubenelgenubi',
    ];

    it.each(validVoiceIds)('accepts valid voice ID: %s', async (voiceId) => {
      const layer = createMockTTSLayer();
      const effect = previewVoice({ voiceId }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(effect);

      expect(result.voiceId).toBe(voiceId);
    });
  });
});
