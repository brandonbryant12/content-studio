import { describe, expect, it } from 'vitest';
import {
  getAuthErrorMessage,
  getSSOCallbackErrorNotice,
  MICROSOFT_SSO_AUTH_FLOW,
} from './auth-errors';

describe('getAuthErrorMessage', () => {
  const ssoFailureMessage =
    "We couldn't complete Microsoft sign-in. Try again, and if you still need access to Content Studio, contact your administrator.";

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

  it('maps direct SSO authorization failures', () => {
    expect(
      getAuthErrorMessage(
        { code: 'SSO_AUTHORIZATION_FAILED' },
        'Unable to sign in with Microsoft.',
      ),
    ).toBe(ssoFailureMessage);
  });

  it('maps SSO group-membership failures from Better Auth callback tokens', () => {
    expect(
      getAuthErrorMessage(
        { error: 'Microsoft_SSO_group_membership_is_required' },
        'Unable to sign in with Microsoft.',
      ),
    ).toBe(ssoFailureMessage);
  });
});

describe('getSSOCallbackErrorNotice', () => {
  it('returns a generic notice for Microsoft SSO callback failures', () => {
    expect(
      getSSOCallbackErrorNotice({
        authFlow: MICROSOFT_SSO_AUTH_FLOW,
        error: 'SSO_GROUP_MEMBERSHIP_REQUIRED',
      }),
    ).toEqual({
      title: 'Microsoft sign-in failed',
      description:
        "We couldn't complete Microsoft sign-in. Try again, and if you still need access to Content Studio, contact your administrator.",
    });
  });

  it('returns the same generic notice for unknown callback errors', () => {
    expect(
      getSSOCallbackErrorNotice({
        authFlow: MICROSOFT_SSO_AUTH_FLOW,
        error: 'invalid_code',
      }),
    ).toEqual({
      title: 'Microsoft sign-in failed',
      description:
        "We couldn't complete Microsoft sign-in. Try again, and if you still need access to Content Studio, contact your administrator.",
    });
  });

  it('returns null when the callback is not part of the Microsoft SSO flow', () => {
    expect(
      getSSOCallbackErrorNotice({
        authFlow: 'password',
        error: 'UNKNOWN_ERROR',
      }),
    ).toBeNull();
  });

  it('returns null when there is no callback error detail', () => {
    expect(
      getSSOCallbackErrorNotice({
        authFlow: MICROSOFT_SSO_AUTH_FLOW,
      }),
    ).toBeNull();
  });
});
