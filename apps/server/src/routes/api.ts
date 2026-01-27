import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trustedOrigins } from '../config';
import { env } from '../env';
import { api } from '../services';

/**
 * API routes (handled by oRPC).
 */
export const apiRoute = new Hono()
  .use(
    cors({
      origin: trustedOrigins,
      credentials: true,
    }),
  )
  .all('/*', async (c, next) => {
    const { matched, response } = await api.handler(c.req.raw);
    if (matched) {
      return c.newResponse(response.body, response);
    }
    await next();
  });

export const apiPath = `${env.PUBLIC_SERVER_API_PATH}`;
