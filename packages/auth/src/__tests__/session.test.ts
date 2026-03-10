import { Effect, Layer } from 'effect';
import { describe, it, expect, vi } from 'vitest';
import type { UnauthorizedError } from '../errors';
import type { AuthInstance } from '../server/auth';
import { Policy, type PolicyService } from '../policy/service';
import { Role } from '../policy/types';
import {
  getSession,
  getSessionAccessToken,
  getSessionWithRole,
  requireSession,
} from '../server/session';

// Mock auth instance factory
const createMockAuth = (
  session: { user: { id: string; email: string; name: string } } | null,
): AuthInstance =>
  ({
    api: {
      getSession: vi.fn().mockResolvedValue(session),
    },
    $Infer: {} as AuthInstance['$Infer'],
    handler: vi.fn(),
  }) as unknown as AuthInstance;

// Mock policy service
const createMockPolicy = (
  roleMap: Record<string, Role> = {},
): PolicyService => ({
  getUserRole: (userId) => Effect.succeed(roleMap[userId] ?? Role.USER),
});

describe('getSession', () => {
  it('should return session when authenticated', async () => {
    const mockSession = {
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    };
    const auth = createMockAuth(mockSession);
    const headers = new Headers();

    const result = await Effect.runPromise(getSession(auth, headers));

    expect(result).toEqual(mockSession);
  });

  it('should return null when not authenticated', async () => {
    const auth = createMockAuth(null);
    const headers = new Headers();

    const result = await Effect.runPromise(getSession(auth, headers));

    expect(result).toBeNull();
  });

  it('should fail with AuthSessionLookupError when auth throws', async () => {
    const auth = {
      api: {
        getSession: vi.fn().mockRejectedValue(new Error('Auth error')),
      },
    } as unknown as AuthInstance;
    const headers = new Headers();

    const exit = await Effect.runPromiseExit(getSession(auth, headers));

    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error._tag).toBe('AuthSessionLookupError');
      expect(exit.cause.error.message).toBe('Session lookup failed');
    }
  });

  it('forwards only the authorization header for bearer-only auth', async () => {
    const getSessionMock = vi.fn().mockResolvedValue(null);
    const auth = {
      api: {
        getSession: getSessionMock,
      },
    } as unknown as AuthInstance;
    const headers = new Headers();
    headers.set('authorization', 'Bearer signed.jwt.token');
    headers.set('cookie', 'better-auth.session_token=abc');

    await Effect.runPromise(getSession(auth, headers));

    expect(getSessionMock).toHaveBeenCalledTimes(1);
    const [args] = getSessionMock.mock.calls[0] as [{ headers: Headers }];
    expect(args.headers.get('authorization')).toBe('Bearer signed.jwt.token');
    expect(args.headers.get('cookie')).toBeNull();
  });
});

describe('getSessionAccessToken', () => {
  it('returns the signed session token when a cookie-backed session is valid', async () => {
    const getSessionMock = vi.fn().mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    });
    const auth = {
      api: {
        getSession: getSessionMock,
      },
    } as unknown as AuthInstance;
    const headers = new Headers();
    headers.set('cookie', 'better-auth.session_token=signed.jwt.token');

    const result = await Effect.runPromise(
      getSessionAccessToken(auth, headers),
    );

    expect(result).toBe('signed.jwt.token');
    expect(getSessionMock).toHaveBeenCalledTimes(1);
    const [args] = getSessionMock.mock.calls[0] as [{ headers: Headers }];
    expect(args.headers.get('cookie')).toBe(
      'better-auth.session_token=signed.jwt.token',
    );
  });

  it('returns null when no valid session exists for the cookie', async () => {
    const auth = createMockAuth(null);
    const headers = new Headers();
    headers.set('cookie', 'better-auth.session_token=signed.jwt.token');

    const result = await Effect.runPromise(
      getSessionAccessToken(auth, headers),
    );

    expect(result).toBeNull();
  });
});

describe('getSessionWithRole', () => {
  it('should return session with user role from database', async () => {
    const mockSession = {
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    };
    const auth = createMockAuth(mockSession);
    const headers = new Headers();
    const policyLayer = Layer.succeed(
      Policy,
      createMockPolicy({ 'user-1': Role.ADMIN }),
    );

    const result = await Effect.runPromise(
      getSessionWithRole(auth, headers).pipe(Effect.provide(policyLayer)),
    );

    expect(result).not.toBeNull();
    expect(result?.user.id).toBe('user-1');
    expect(result?.user.role).toBe(Role.ADMIN);
  });

  it('should return null when not authenticated', async () => {
    const auth = createMockAuth(null);
    const headers = new Headers();
    const policyLayer = Layer.succeed(Policy, createMockPolicy());

    const result = await Effect.runPromise(
      getSessionWithRole(auth, headers).pipe(Effect.provide(policyLayer)),
    );

    expect(result).toBeNull();
  });

  it('should default to USER role when not found', async () => {
    const mockSession = {
      user: {
        id: 'unknown-user',
        email: 'test@example.com',
        name: 'Test User',
      },
    };
    const auth = createMockAuth(mockSession);
    const headers = new Headers();
    const policyLayer = Layer.succeed(Policy, createMockPolicy({}));

    const result = await Effect.runPromise(
      getSessionWithRole(auth, headers).pipe(Effect.provide(policyLayer)),
    );

    expect(result?.user.role).toBe(Role.USER);
  });
});

describe('requireSession', () => {
  it('should return session with user when authenticated', async () => {
    const mockSession = {
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    };
    const auth = createMockAuth(mockSession);
    const headers = new Headers();
    const policyLayer = Layer.succeed(Policy, createMockPolicy());

    const result = await Effect.runPromise(
      requireSession(auth, headers).pipe(Effect.provide(policyLayer)),
    );

    expect(result.user.id).toBe('user-1');
    expect(result.session).toEqual(mockSession);
  });

  it('should fail with UnauthorizedError when not authenticated', async () => {
    const auth = createMockAuth(null);
    const headers = new Headers();
    const policyLayer = Layer.succeed(Policy, createMockPolicy());

    const exit = await Effect.runPromiseExit(
      requireSession(auth, headers).pipe(Effect.provide(policyLayer)),
    );

    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure') {
      const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
      expect(error?._tag).toBe('UnauthorizedError');
      expect((error as UnauthorizedError).message).toBe(
        'Authentication required',
      );
    }
  });
});
