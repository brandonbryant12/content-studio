import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { credentialedCorsPolicy } from '../config';
import { env } from '../env';
import { createApiRateLimit } from '../middleware/rate-limit';
import { api } from '../services';

const apiRateLimit = createApiRateLimit({
  redisUrl: env.SERVER_REDIS_URL,
  trustProxyHeaders: env.TRUST_PROXY,
});

export const apiRoute = new Hono<{ Variables: { requestId: string } }>()
  .use(
    cors({
      ...credentialedCorsPolicy,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      maxAge: 600,
    }),
  )
  .use(apiRateLimit)
  .all('/*', async (c, next) => {
    const { matched, response } = await api.handler(
      c.req.raw,
      c.get('requestId'),
    );
    if (matched) {
      return c.newResponse(response.body, response);
    }
    await next();
  });

export const apiPath = `${env.PUBLIC_SERVER_API_PATH}`;
