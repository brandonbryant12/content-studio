import { Effect } from 'effect';
import { TTSError, TTSQuotaExceededError } from '../errors';

describe('TTS Errors', () => {
  describe('TTSError', () => {
    it('should create a tagged error with message', () => {
      const error = new TTSError({ message: 'Something went wrong' });

      expect(error._tag).toBe('TTSError');
      expect(error.message).toBe('Something went wrong');
    });

    it('should accept optional cause', () => {
      const cause = new Error('Original error');
      const error = new TTSError({ message: 'Wrapped error', cause });

      expect(error._tag).toBe('TTSError');
      expect(error.message).toBe('Wrapped error');
      expect(error.cause).toBe(cause);
    });

    it('should fail an Effect with TTSError', async () => {
      const program = Effect.fail(new TTSError({ message: 'Test failure' }));

      const result = await Effect.runPromiseExit(program);

      expect(result._tag).toBe('Failure');
    });
  });

  describe('TTSQuotaExceededError', () => {
    it('should create a tagged error with message', () => {
      const error = new TTSQuotaExceededError({ message: 'Quota exceeded' });

      expect(error._tag).toBe('TTSQuotaExceededError');
      expect(error.message).toBe('Quota exceeded');
    });

    it('should fail an Effect with TTSQuotaExceededError', async () => {
      const program = Effect.fail(
        new TTSQuotaExceededError({ message: 'Too many requests' }),
      );

      const result = await Effect.runPromiseExit(program);

      expect(result._tag).toBe('Failure');
    });

    it('should be distinguishable from TTSError', () => {
      const ttsError = new TTSError({ message: 'Generic error' });
      const quotaError = new TTSQuotaExceededError({
        message: 'Quota exceeded',
      });

      expect(ttsError._tag).not.toBe(quotaError._tag);
      expect(ttsError._tag).toBe('TTSError');
      expect(quotaError._tag).toBe('TTSQuotaExceededError');
    });
  });
});
