import { Effect } from 'effect';
import { LLMError, LLMRateLimitError } from '../errors';

describe('LLM Errors', () => {
  describe('LLMError', () => {
    it('should create a tagged error with message', () => {
      const error = new LLMError({ message: 'Something went wrong' });

      expect(error._tag).toBe('LLMError');
      expect(error.message).toBe('Something went wrong');
    });

    it('should accept optional cause', () => {
      const cause = new Error('Original error');
      const error = new LLMError({ message: 'Wrapped error', cause });

      expect(error._tag).toBe('LLMError');
      expect(error.message).toBe('Wrapped error');
      expect(error.cause).toBe(cause);
    });

    it('should fail an Effect with LLMError', async () => {
      const program = Effect.fail(new LLMError({ message: 'Test failure' }));

      const result = await Effect.runPromiseExit(program);

      expect(result._tag).toBe('Failure');
    });
  });

  describe('LLMRateLimitError', () => {
    it('should create a tagged error with message', () => {
      const error = new LLMRateLimitError({ message: 'Rate limit exceeded' });

      expect(error._tag).toBe('LLMRateLimitError');
      expect(error.message).toBe('Rate limit exceeded');
    });

    it('should fail an Effect with LLMRateLimitError', async () => {
      const program = Effect.fail(
        new LLMRateLimitError({ message: 'Too many requests' }),
      );

      const result = await Effect.runPromiseExit(program);

      expect(result._tag).toBe('Failure');
    });

    it('should be distinguishable from LLMError', () => {
      const llmError = new LLMError({ message: 'Generic error' });
      const rateLimitError = new LLMRateLimitError({ message: 'Rate limited' });

      expect(llmError._tag).not.toBe(rateLimitError._tag);
      expect(llmError._tag).toBe('LLMError');
      expect(rateLimitError._tag).toBe('LLMRateLimitError');
    });
  });
});
