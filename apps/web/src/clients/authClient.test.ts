import { beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshAccessToken } from './authClient';
import { clearAuthToken, getAuthToken, setAuthToken } from '@/shared/lib/auth-token';

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock('@repo/auth/client', () => ({
  createAuthClient: vi.fn(() => ({
    getSession: getSessionMock,
  })),
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
    getSessionMock.mockReset();
  });

  it('retries session lookup without bearer token on unauthorized', async () => {
    setAuthToken('expired.token');
    getSessionMock
      .mockResolvedValueOnce({
        data: null,
        error: { status: 401 },
      })
      .mockResolvedValueOnce({
        data: { user: { id: 'user_123' } },
        error: null,
      });

    await expect(refreshAccessToken()).resolves.toBe(true);
    expect(getSessionMock).toHaveBeenCalledTimes(2);
    expect(getAuthToken()).toBeNull();
  });

  it('does not clear token on non-auth refresh failure', async () => {
    setAuthToken('keep.token');
    getSessionMock.mockResolvedValueOnce({
      data: null,
      error: { status: 503 },
    });

    await expect(refreshAccessToken()).resolves.toBe(false);
    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(getAuthToken()).toBe('keep.token');
  });

  it('clears token when session resolves without a user', async () => {
    setAuthToken('stale.token');
    getSessionMock.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(refreshAccessToken()).resolves.toBe(false);
    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(getAuthToken()).toBeNull();
  });
});
