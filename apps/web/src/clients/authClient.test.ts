import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshAccessToken } from './authClient';
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from '@/shared/lib/auth-token';
import { server } from '@/test-utils/server';

vi.mock('@repo/auth/client', () => ({
  createAuthClient: vi.fn(() => ({})),
}));

vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'http://localhost:3036',
    PUBLIC_SERVER_API_PATH: '/api',
  },
}));

describe('refreshAccessToken', () => {
  beforeEach(() => {
    clearAuthToken();
  });

  it('rehydrates the bearer token from a valid session cookie', async () => {
    server.use(
      http.get(
        'http://localhost:3036/api/auth/access-token',
        () =>
          new HttpResponse(null, {
            status: 204,
            headers: { 'set-auth-token': 'signed.jwt.token' },
          }),
      ),
    );

    await expect(refreshAccessToken()).resolves.toBe(true);
    expect(getAuthToken()).toBe('signed.jwt.token');
  });

  it('clears the in-memory token when the session is not authenticated', async () => {
    setAuthToken('stale.token');
    server.use(
      http.get(
        'http://localhost:3036/api/auth/access-token',
        () => new HttpResponse(null, { status: 401 }),
      ),
    );

    await expect(refreshAccessToken()).resolves.toBe(false);
    expect(getAuthToken()).toBeNull();
  });

  it('does not clear the token on non-auth refresh failures', async () => {
    setAuthToken('keep.token');
    server.use(
      http.get(
        'http://localhost:3036/api/auth/access-token',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );

    await expect(refreshAccessToken()).resolves.toBe(false);
    expect(getAuthToken()).toBe('keep.token');
  });

  it('clears the token when the reissue header is missing', async () => {
    setAuthToken('stale.token');
    server.use(
      http.get(
        'http://localhost:3036/api/auth/access-token',
        () =>
          new HttpResponse(null, {
            status: 204,
          }),
      ),
    );

    await expect(refreshAccessToken()).resolves.toBe(false);
    expect(getAuthToken()).toBeNull();
  });
});
