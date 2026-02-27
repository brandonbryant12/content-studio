import { describe, expect, it } from 'vitest';
import { getAuthErrorMessage } from './auth-errors';

describe('getAuthErrorMessage', () => {
  it('returns fallback for unknown input', () => {
    expect(getAuthErrorMessage(null, 'Unable to sign in.')).toBe(
      'Unable to sign in.',
    );
  });

  it('maps invalid credentials', () => {
    expect(
      getAuthErrorMessage(
        { code: 'INVALID_EMAIL_OR_PASSWORD' },
        'Unable to sign in.',
      ),
    ).toBe('Invalid email or password.');
  });

  it('maps duplicate account', () => {
    expect(
      getAuthErrorMessage(
        { code: 'USER_ALREADY_EXISTS' },
        'Unable to create account.',
      ),
    ).toBe('An account with that email already exists.');
  });

  it('maps rate limiting by code', () => {
    expect(
      getAuthErrorMessage(
        { code: 'RATE_LIMITED' },
        'Unable to sign in with Microsoft.',
      ),
    ).toBe('Too many sign-in attempts. Please try again in a moment.');
  });

  it('maps rate limiting by status', () => {
    expect(
      getAuthErrorMessage({ status: 429 }, 'Unable to sign in with Microsoft.'),
    ).toBe('Too many sign-in attempts. Please try again in a moment.');
  });

  it('falls back for unmapped auth errors', () => {
    expect(
      getAuthErrorMessage(
        { code: 'UNKNOWN_AUTH_ERROR', message: 'Provider details' },
        'Unable to sign in.',
      ),
    ).toBe('Unable to sign in.');
  });
});
