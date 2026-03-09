import { Policy, Role } from '@repo/auth/policy';
import { Effect, Layer } from 'effect';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ServerRuntime } from '../runtime';
import type { AuthInstance } from '@repo/auth/server';
import { createApi } from '../index';
import { createORPCContext } from '../orpc';

const policyLayer = Layer.succeed(Policy, {
  getUserRole: () => Effect.succeed(Role.USER),
});

const createRuntime = (): ServerRuntime =>
  ({
    runPromise: (effect: Effect.Effect<unknown, unknown, never>) =>
      Effect.runPromise(
        effect.pipe(
          Effect.provide(
            policyLayer as unknown as Layer.Layer<never, never, never>,
          ),
        ),
      ),
    runPromiseExit: (effect: Effect.Effect<unknown, unknown, never>) =>
      Effect.runPromiseExit(
        effect.pipe(
          Effect.provide(
            policyLayer as unknown as Layer.Layer<never, never, never>,
          ),
        ),
      ),
  }) as unknown as ServerRuntime;

const createAuth = (getSession: () => Promise<unknown>): AuthInstance =>
  ({
    api: {
      getSession: vi.fn().mockImplementation(getSession),
    },
    $Infer: {} as AuthInstance['$Infer'],
    handler: vi.fn(),
  }) as unknown as AuthInstance;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createORPCContext integration', () => {
  it('returns null auth context when there is no session', async () => {
    const context = await createORPCContext({
      auth: createAuth(async () => null),
      runtime: createRuntime(),
      headers: new Headers(),
      requestId: 'req-no-session',
    });

    expect(context.session).toBeNull();
    expect(context.user).toBeNull();
    expect(context.requestId).toBe('req-no-session');
  });

  it('maps auth dependency failures to SERVICE_UNAVAILABLE with request metadata', async () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      createORPCContext({
        auth: createAuth(async () => {
          throw new Error('auth backend unavailable');
        }),
        runtime: createRuntime(),
        headers: new Headers(),
        requestId: 'req-auth-failure',
      }),
    ).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      data: {
        requestId: 'req-auth-failure',
        errorTag: 'AuthSessionLookupError',
      },
    });

    expect(logSpy).toHaveBeenCalledWith(
      '[AUTH_CONTEXT_FAILURE]',
      '[requestId:req-auth-failure]',
      '[errorTag:AuthSessionLookupError]',
      expect.any(String),
    );
  });
});

describe('createApi auth integration', () => {
  it('returns 401 UNAUTHORIZED for protected routes when no user session exists', async () => {
    const api = createApi({
      auth: createAuth(async () => null),
      serverRuntime: createRuntime(),
      serverUrl: 'http://localhost:3036',
      apiPath: '/api',
    });

    const { matched, response } = await api.handler(
      new Request('http://localhost:3036/api/events'),
      'req-no-session',
    );

    expect(matched).toBe(true);
    expect(response).toBeDefined();
    if (!response) {
      throw new Error('Expected matched API response');
    }
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Missing user session. Please log in!',
      status: 401,
    });
  });
});
