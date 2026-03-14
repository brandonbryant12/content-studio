import { it } from '@effect/vitest';
import { Effect } from 'effect';
import { describe, expect, vi } from 'vitest';
import type { PreviewVoiceResult, TTSService } from '../../service';
import {
  TTSError,
  TTSQuotaExceededError,
  VoiceNotFoundError,
} from '../../../errors';
import { expectTaggedFailure } from '../../../testing/assertions';
import { createMockTTS } from '../../../testing/tts';
import { VOICES } from '../../voices';
import { previewVoice } from '../preview-voice';

describe('previewVoice', () => {
  it.layer(createMockTTS({ voices: VOICES }))('successful preview', (it) => {
    it.effect('generates audio preview for valid voice ID', () =>
      Effect.gen(function* () {
        const result = yield* previewVoice({ voiceId: 'Charon' });
        expect(result.voiceId).toBe('Charon');
        expect(result.audioEncoding).toBe('LINEAR16');
        expect(Buffer.isBuffer(result.audioContent)).toBe(true);
      }),
    );

    it.effect('passes custom text to the TTS service', () =>
      Effect.gen(function* () {
        const previewVoiceSpy = vi.fn<TTSService['previewVoice']>(
          ({ voiceId }) =>
            Effect.succeed({
              audioContent: Buffer.from('custom preview'),
              audioEncoding: 'LINEAR16' as const,
              voiceId,
            } satisfies PreviewVoiceResult),
        );

        const result = yield* previewVoice({
          voiceId: 'Kore',
          text: 'Custom preview text',
        }).pipe(
          Effect.provide(
            createMockTTS({
              voices: VOICES,
              previewVoice: previewVoiceSpy,
            }),
          ),
        );

        expect(result.voiceId).toBe('Kore');
        expect(previewVoiceSpy).toHaveBeenCalledWith({
          voiceId: 'Kore',
          text: 'Custom preview text',
        });
      }),
    );
  });

  it.layer(
    createMockTTS({
      voices: VOICES,
      previewVoice: (options) =>
        Effect.succeed({
          audioContent: Buffer.from('wav audio'),
          audioEncoding: 'LINEAR16',
          voiceId: options.voiceId,
        } satisfies PreviewVoiceResult),
    }),
  )('audio encoding', (it) => {
    it.effect('returns LINEAR16 encoding from the TTS service', () =>
      Effect.gen(function* () {
        const result = yield* previewVoice({
          voiceId: 'Charon',
        });
        expect(result.audioEncoding).toBe('LINEAR16');
      }),
    );
  });

  describe('voice validation', () => {
    it.effect('fails with VoiceNotFoundError for invalid voice ID', () =>
      Effect.gen(function* () {
        const exit = yield* previewVoice({ voiceId: 'InvalidVoice' }).pipe(
          Effect.exit,
        );
        const error = expectTaggedFailure(exit, 'VoiceNotFoundError');

        expect(error.voiceId).toBe('InvalidVoice');
      }).pipe(
        Effect.provide(
          createMockTTS({
            voices: VOICES,
            previewVoice: (options) =>
              Effect.fail(new VoiceNotFoundError({ voiceId: options.voiceId })),
          }),
        ),
      ),
    );

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
    it.effect('propagates TTSError from service', () =>
      Effect.gen(function* () {
        const exit = yield* previewVoice({ voiceId: 'Charon' }).pipe(
          Effect.exit,
        );
        expectTaggedFailure(exit, 'TTSError');
      }).pipe(
        Effect.provide(
          createMockTTS({
            voices: VOICES,
            previewVoice: () =>
              Effect.fail(new TTSError({ message: 'TTS service unavailable' })),
          }),
        ),
      ),
    );

    it.effect('propagates TTSQuotaExceededError from service', () =>
      Effect.gen(function* () {
        const exit = yield* previewVoice({ voiceId: 'Charon' }).pipe(
          Effect.exit,
        );
        expectTaggedFailure(exit, 'TTSQuotaExceededError');
      }).pipe(
        Effect.provide(
          createMockTTS({
            voices: VOICES,
            previewVoice: () =>
              Effect.fail(
                new TTSQuotaExceededError({ message: 'Quota exceeded' }),
              ),
          }),
        ),
      ),
    );
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

    for (const voiceId of validVoiceIds) {
      it.effect(`accepts valid voice ID: ${voiceId}`, () =>
        Effect.gen(function* () {
          const result = yield* previewVoice({ voiceId });
          expect(result.voiceId).toBe(voiceId);
        }).pipe(Effect.provide(createMockTTS({ voices: VOICES }))),
      );
    }
  });
});
