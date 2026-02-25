import { Policy, Role } from '@repo/auth/policy';
import { Effect, Layer } from 'effect';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ServerRuntime } from '../runtime';
import type { AuthInstance } from '@repo/auth/server';
import { createORPCContext } from '../orpc';

const policyLayer = Layer.succeed(Policy, {
  getUserRole: () => Effect.succeed(Role.USER),
});

const createRuntime = (): ServerRuntime =>
  ({
    runPromise: (effect: Effect.Effect<unknown, unknown, never>) =>
      Effect.runPromise(
        effect.pipe(
          Effect.provide(policyLayer as unknown as Layer.Layer<never, never, never>),
        ),
      ),
    runPromiseExit: (effect: Effect.Effect<unknown, unknown, never>) =>
      Effect.runPromiseExit(
        effect.pipe(
          Effect.provide(policyLayer as unknown as Layer.Layer<never, never, never>),
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
      data: { requestId: 'req-auth-failure', errorTag: 'AuthSessionLookupError' },
    });

    expect(logSpy).toHaveBeenCalledWith(
      '[AUTH_CONTEXT_FAILURE]',
      '[requestId:req-auth-failure]',
      '[errorTag:AuthSessionLookupError]',
      expect.any(String),
    );
  });
});
