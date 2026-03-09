import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock('../config', () => ({
  authCorsPolicy: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
}));

vi.mock('../env', () => ({
  env: {
    SERVER_REDIS_URL: 'redis://localhost:6379',
    TRUST_PROXY: false,
    AUTH_RATE_LIMIT_MAX: 10,
    AUTH_RATE_LIMIT_WINDOW_MS: 60_000,
    PUBLIC_SERVER_API_PATH: '/api',
  },
}));

vi.mock('../middleware/rate-limit', () => ({
  createAuthRateLimit:
    () => async (_c: { req: Request }, next: () => Promise<void>) =>
      next(),
}));

vi.mock('../services', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
    handler: vi.fn(),
  },
}));

import { authRoute } from '../routes/auth';

describe('authRoute', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
  });

  it('returns 204 and reissues the signed session token for a valid cookie session', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    });

    const res = await authRoute.request('/access-token', {
      headers: {
        cookie: 'better-auth.session_token=signed.jwt.token',
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get('set-auth-token')).toBe('signed.jwt.token');
  });

  it('returns 401 when no valid session exists', async () => {
    getSessionMock.mockResolvedValue(null);

    const res = await authRoute.request('/access-token');

    expect(res.status).toBe(401);
  });

  it('returns 503 when session lookup fails unexpectedly', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    getSessionMock.mockRejectedValue(new Error('auth lookup down'));

    const res = await authRoute.request('/access-token');

    expect(res.status).toBe(503);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[AUTH_ACCESS_TOKEN_FAILURE]',
      '[errorTag:AuthSessionLookupError]',
      'Session lookup failed',
    );
  });
});
