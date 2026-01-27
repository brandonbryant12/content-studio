import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trustedOrigins } from '../config';
import { env } from '../env';
import { auth } from '../services';

/**
 * Authentication routes (handled by better-auth).
 */
export const authRoute = new Hono()
  .use(
    cors({
      origin: trustedOrigins,
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['POST', 'GET', 'OPTIONS'],
      exposeHeaders: ['Content-Length'],
      maxAge: 600,
    }),
  )
  .on(['POST', 'GET'], '/*', (c) => auth.handler(c.req.raw));

export const authPath = `${env.PUBLIC_SERVER_API_PATH}/auth`;
