import { describe, expect, it } from 'vitest';
import {
  applyAuthToken,
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from './auth-token';

describe('auth token storage', () => {
  it('stores and reads token', () => {
    clearAuthToken();
    setAuthToken('token-123');
    expect(getAuthToken()).toBe('token-123');
  });

  it('clears token', () => {
    setAuthToken('token-abc');
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it('applies null token as clear', () => {
    setAuthToken('token-xyz');
    applyAuthToken(null);
    expect(getAuthToken()).toBeNull();
  });
});
