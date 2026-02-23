import { describe, it, expect } from 'vitest';
import type { ImageGenError } from '../../errors';
import { GoogleApiError } from '../../google/error-parser';
import { mapError } from '../map-error';

describe('ImageGen mapError', () => {
  it('maps structured Google error to ImageGenRateLimitError', () => {
    const result = mapError(
      new GoogleApiError('Google Image API error', {
        statusCode: 429,
        retryAfter: 12,
        details: {
          status: 'RESOURCE_EXHAUSTED',
          message: 'Rate limit exceeded',
        },
      }),
    );

    expect(result?._tag).toBe('ImageGenRateLimitError');
    expect(result.message).toBe('Rate limit exceeded');
    if (result._tag === 'ImageGenRateLimitError') {
      expect(result.retryAfter).toBe(12);
    }
  });

  it('maps safety-related error to ImageGenContentFilteredError', () => {
    const result = mapError(new Error('Safety system blocked this prompt'));
    expect(result?._tag).toBe('ImageGenContentFilteredError');
    expect(result.message).toBe('Safety system blocked this prompt');
  });

  it('maps generic Error to ImageGenError with cause', () => {
    const original = new Error('Connection timeout');
    const result = mapError(original);
    expect(result?._tag).toBe('ImageGenError');
    expect(result.message).toBe('Connection timeout');
    expect((result as ImageGenError).cause).toBe(original);
  });
});
