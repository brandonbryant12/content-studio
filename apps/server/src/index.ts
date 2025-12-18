import { serveStatic } from '@hono/node-server/serve-static';
import { createApi, type StorageConfig } from '@repo/api/server';
import { createAuth } from '@repo/auth/server';
import { createDb } from '@repo/db/client';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { env } from './env';
import { generateRootHtml } from './utils';

// ========================================================================= //

const trustedOrigins = [env.PUBLIC_WEB_URL].map((url) => new URL(url).origin);

// Build storage config based on env
const buildStorageConfig = (): StorageConfig => {
  if (env.STORAGE_PROVIDER === 'filesystem') {
    if (!env.STORAGE_PATH)
      throw new Error('STORAGE_PATH required for filesystem provider');
    return {
      provider: 'filesystem',
      basePath: env.STORAGE_PATH,
      baseUrl: env.STORAGE_BASE_URL ?? `${env.PUBLIC_SERVER_URL}/storage`,
    };
  }
  if (env.STORAGE_PROVIDER === 's3') {
    if (
      !env.S3_BUCKET ||
      !env.S3_REGION ||
      !env.S3_ACCESS_KEY_ID ||
      !env.S3_SECRET_ACCESS_KEY
    ) {
      throw new Error(
        'S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY required for s3 provider',
      );
    }
    return {
      provider: 's3',
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      endpoint: env.S3_ENDPOINT,
    };
  }
  return { provider: 'database' };
};

export const storageConfig = buildStorageConfig();

const db = createDb({ databaseUrl: env.SERVER_POSTGRES_URL });
const auth = createAuth({
  webUrl: env.PUBLIC_WEB_URL,
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
  authSecret: env.SERVER_AUTH_SECRET,
  db,
});
const api = createApi({
  auth,
  db,
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
  geminiApiKey: env.GEMINI_API_KEY,
  storageConfig,
});

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// ========================================================================= //

app.get('/healthcheck', (c) => {
  return c.text('OK');
});

app.use(logger());

// Log stack traces for 500 errors
app.onError((err, c) => {
  console.error('\t[ERROR]', err.stack || err.message || err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

app.get('/', (c) => {
  return c.html(generateRootHtml(env.PUBLIC_WEB_URL, env.PUBLIC_SERVER_URL));
});

// Serve static files from storage directory (only for filesystem provider)
if (storageConfig.provider === 'filesystem') {
  app.use(
    '/storage/*',
    serveStatic({
      root: storageConfig.basePath,
      rewriteRequestPath: (path) => path.replace('/storage', ''),
    }),
  );
}

// ========================================================================= //

app.use(
  `${env.PUBLIC_SERVER_API_PATH}/auth/*`,
  cors({
    origin: trustedOrigins,
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
  }),
);

app.on(['POST', 'GET'], `${env.PUBLIC_SERVER_API_PATH}/auth/*`, (c) =>
  auth.handler(c.req.raw),
);

// ========================================================================= //

app.use(
  `${env.PUBLIC_SERVER_API_PATH}/*`,
  cors({
    origin: trustedOrigins,
    credentials: true,
  }),
  async (c, next) => {
    const { matched, response } = await api.handler(c.req.raw);
    if (matched) {
      return c.newResponse(response.body, response);
    }

    await next();
  },
);

// ========================================================================= //

export default app;
