import { describe, expect, it } from 'vitest';
import {
  getAuthErrorMessage,
  getSSOCallbackErrorNotice,
  MICROSOFT_SSO_AUTH_FLOW,
} from './auth-errors';

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

  it('maps direct SSO authorization failures', () => {
    expect(
      getAuthErrorMessage(
        { code: 'SSO_AUTHORIZATION_FAILED' },
        'Unable to sign in with Microsoft.',
      ),
    ).toBe(
      'Microsoft sign-in was denied. Try again or contact your administrator.',
    );
  });

  it('maps SSO group-membership failures from Better Auth callback tokens', () => {
    expect(
      getAuthErrorMessage(
        { error: 'Microsoft_SSO_group_membership_is_required' },
        'Unable to sign in with Microsoft.',
      ),
    ).toBe('Your Microsoft account does not have access to Content Studio.');
  });
});

describe('getSSOCallbackErrorNotice', () => {
  it('returns a targeted notice for required Microsoft group membership', () => {
    expect(
      getSSOCallbackErrorNotice({
        authFlow: MICROSOFT_SSO_AUTH_FLOW,
        error: 'SSO_GROUP_MEMBERSHIP_REQUIRED',
      }),
    ).toEqual({
      title: 'Your Microsoft account does not have access',
      description:
        'Use a Microsoft account in the approved Content Studio access group, or contact your administrator for access.',
    });
  });

  it('returns a generic denial notice for provider access_denied callbacks', () => {
    expect(
      getSSOCallbackErrorNotice({
        authFlow: MICROSOFT_SSO_AUTH_FLOW,
        error: 'access_denied',
      }),
    ).toEqual({
      title: 'Microsoft sign-in was canceled or denied',
      description:
        'Try again with your approved Microsoft account. If access should have been granted, contact your administrator.',
    });
  });

  it('returns a targeted notice for Better Auth Microsoft callback tokens', () => {
    expect(
      getSSOCallbackErrorNotice({
        authFlow: MICROSOFT_SSO_AUTH_FLOW,
        error: 'Microsoft_SSO_authorization_failed',
      }),
    ).toEqual({
      title: 'Microsoft sign-in was denied',
      description:
        "We couldn't verify that this Microsoft account is allowed to access Content Studio. Try again or contact your administrator if you should have access.",
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
});
