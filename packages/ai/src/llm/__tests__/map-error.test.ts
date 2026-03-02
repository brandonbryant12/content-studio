import { NoObjectGeneratedError } from 'ai';
import { describe, it, expect } from 'vitest';
import type { LLMError } from '../../errors';
import { mapError } from '../map-error';

describe('LLM mapError', () => {
  it('maps error with "rate limit" to LLMRateLimitError', () => {
    const result = mapError(new Error('API rate limit exceeded'));
    expect(result?._tag).toBe('LLMRateLimitError');
    expect(result.message).toBe('API rate limit exceeded');
  });

  it('maps error with "429" to LLMRateLimitError', () => {
    const result = mapError(new Error('HTTP 429 Too Many Requests'));
    expect(result?._tag).toBe('LLMRateLimitError');
    expect(result.message).toBe('HTTP 429 Too Many Requests');
  });

  it('maps generic Error to LLMError with cause', () => {
    const original = new Error('Connection timeout');
    const result = mapError(original);
    expect(result?._tag).toBe('LLMError');
    expect(result.message).toBe('Connection timeout');
    if (result._tag === 'LLMError') {
      expect(result.isRetryable).toBe(true);
    }
    expect((result as LLMError).cause).toBe(original);
  });

  it('maps non-Error value to LLMError with "Unknown LLM error"', () => {
    const result = mapError(42);
    expect(result?._tag).toBe('LLMError');
    expect(result.message).toBe('Unknown LLM error');
    if (result._tag === 'LLMError') {
      expect(result.isRetryable).toBe(false);
    }
    expect((result as LLMError).cause).toBe(42);
  });

  it('marks 503 errors as retryable with structured status metadata', () => {
    const result = mapError(
      Object.assign(new Error('HTTP 503 Service Unavailable'), {
        statusCode: 503,
      }),
    );

    expect(result._tag).toBe('LLMError');
    if (result._tag === 'LLMError') {
      expect(result.isRetryable).toBe(true);
      expect(result.statusCode).toBe(503);
    }
  });

  it('marks 400 errors as non-retryable', () => {
    const result = mapError(
      Object.assign(new Error('HTTP 400 Bad Request'), {
        statusCode: 400,
      }),
    );

    expect(result._tag).toBe('LLMError');
    if (result._tag === 'LLMError') {
      expect(result.isRetryable).toBe(false);
      expect(result.statusCode).toBe(400);
    }
  });

  it('marks NoObjectGeneratedError as retryable', () => {
    const result = mapError(
      new NoObjectGeneratedError({
        message: 'Model did not return a valid object',
        text: '{not-valid-json}',
        response: {} as never,
        usage: {} as never,
        finishReason: 'stop',
      }),
    );

    expect(result._tag).toBe('LLMError');
    if (result._tag === 'LLMError') {
      expect(result.isRetryable).toBe(true);
      expect(result.errorCode).toBe('NO_OBJECT_GENERATED');
    }
  });
});
