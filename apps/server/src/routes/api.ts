import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { corsOriginConfig } from '../config';
import { env } from '../env';
import { apiRateLimit } from '../middleware/rate-limit';
import { api } from '../services';

export const apiRoute = new Hono()
  .use(
    cors({
      origin: corsOriginConfig === '*' ? (origin) => origin : corsOriginConfig,
      credentials: true,
    }),
  )
  .use(apiRateLimit)
  .all('/*', async (c, next) => {
    const { matched, response } = await api.handler(c.req.raw);
    if (matched) {
      return c.newResponse(response.body, response);
    }
    await next();
  });

export const apiPath = `${env.PUBLIC_SERVER_API_PATH}`;
