import { getSessionAccessToken } from '@repo/auth/server';
import { Cause, Effect, Option } from 'effect';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authCorsPolicy } from '../config';
import { env } from '../env';
import { createAuthRateLimit } from '../middleware/rate-limit';
import { auth } from '../services';

const authRateLimit = createAuthRateLimit({
  redisUrl: env.SERVER_REDIS_URL,
  trustProxyHeaders: env.TRUST_PROXY,
  limit: env.AUTH_RATE_LIMIT_MAX,
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
});

export const authRoute = new Hono()
  .use(
    cors({
      ...authCorsPolicy,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['POST', 'GET', 'OPTIONS'],
      exposeHeaders: ['Content-Length', 'set-auth-token'],
      maxAge: 600,
    }),
  )
  .use(authRateLimit)
  .get('/access-token', async (c) => {
    const exit = await Effect.runPromiseExit(
      getSessionAccessToken(auth, c.req.raw.headers),
    );

    if (exit._tag === 'Failure') {
      const failure = Option.getOrUndefined(Cause.failureOption(exit.cause));
      const errorTag =
        failure && typeof failure === 'object' && '_tag' in failure
          ? String((failure as { _tag: unknown })._tag)
          : 'UnknownError';
      const message =
        failure && typeof failure === 'object' && 'message' in failure
          ? String((failure as { message: unknown }).message)
          : 'Access token refresh failed';

      console.error('[AUTH_ACCESS_TOKEN_FAILURE]', '[errorTag:' + errorTag + ']', message);
      return c.body(null, 503);
    }

    const token = exit.value;
    if (!token) {
      return c.body(null, 401);
    }

    c.header('Cache-Control', 'no-store');
    c.header('set-auth-token', token);

    return c.body(null, 204);
  })
  .on(['POST', 'GET'], '/*', (c) => auth.handler(c.req.raw));

export const authPath = `${env.PUBLIC_SERVER_API_PATH}/auth`;
