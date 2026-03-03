import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { credentialedCorsPolicy } from '../config';
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
      ...credentialedCorsPolicy,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['POST', 'GET', 'OPTIONS'],
      exposeHeaders: ['Content-Length', 'set-auth-token'],
      maxAge: 600,
    }),
  )
  .use(authRateLimit)
  .on(['POST', 'GET'], '/*', (c) => auth.handler(c.req.raw));

export const authPath = `${env.PUBLIC_SERVER_API_PATH}/auth`;
