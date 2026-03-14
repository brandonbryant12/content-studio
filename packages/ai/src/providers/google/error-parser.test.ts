import { describe, expect, it } from 'vitest';
import {
  GoogleApiError,
  getGoogleApiErrorDetails,
  isGoogleRateLimit,
  parseGoogleApiErrorBody,
  parseGoogleApiErrorText,
} from './error-parser';

describe('Google API error parsing', () => {
  it('parses structured error bodies', () => {
    expect(
      parseGoogleApiErrorBody(
        JSON.stringify({
          error: {
            code: 429,
            status: 'RESOURCE_EXHAUSTED',
            message: 'Quota exceeded',
          },
        }),
      ),
    ).toEqual({
      code: 429,
      status: 'RESOURCE_EXHAUSTED',
      message: 'Quota exceeded',
    });
  });

  it('extracts embedded JSON errors from free-form text', () => {
    expect(
      parseGoogleApiErrorText(
        'Request failed: {"error":{"code":503,"status":"UNAVAILABLE","message":"Try again"}}',
      ),
    ).toEqual({
      code: 503,
      status: 'UNAVAILABLE',
      message: 'Try again',
    });
  });

  it('reads details from GoogleApiError instances and rate-limit signals', () => {
    const error = new GoogleApiError('Upstream failed', {
      statusCode: 429,
      body: JSON.stringify({
        error: {
          code: 429,
          status: 'RESOURCE_EXHAUSTED',
          message: 'Quota exceeded',
        },
      }),
    });

    const details = getGoogleApiErrorDetails(error);
    expect(details).toEqual({
      code: 429,
      status: 'RESOURCE_EXHAUSTED',
      message: 'Quota exceeded',
    });
    expect(isGoogleRateLimit(details, error.statusCode)).toBe(true);
  });

  it('returns null for unparseable error bodies', () => {
    expect(parseGoogleApiErrorBody('not json')).toBeNull();
    expect(getGoogleApiErrorDetails('plain error text')).toBeNull();
  });
});
