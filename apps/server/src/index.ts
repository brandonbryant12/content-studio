import { serveStatic } from '@hono/node-server/serve-static';
import {
  createApi,
  createServerRuntime,
  type StorageConfig,
} from '@repo/api/server';
import { createAuth } from '@repo/auth/server';
import { createDb } from '@repo/db/client';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { streamSSE } from 'hono/streaming';
import { env } from './env';
import { sseManager } from './sse';
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

// Create shared server runtime ONCE at startup
const serverRuntime = createServerRuntime({
  db,
  geminiApiKey: env.GEMINI_API_KEY,
  storageConfig,
  useMockAI: env.USE_MOCK_AI,
});

const api = createApi({
  auth,
  serverRuntime,
  serverUrl: env.PUBLIC_SERVER_URL,
  apiPath: env.PUBLIC_SERVER_API_PATH,
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
// SSE Events Endpoint
// ========================================================================= //

app.use(
  `${env.PUBLIC_SERVER_API_PATH}/events`,
  cors({
    origin: trustedOrigins,
    credentials: true,
  }),
);

app.get(`${env.PUBLIC_SERVER_API_PATH}/events`, async (c) => {
  // Verify session
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.text('Unauthorized', 401);
  }

  return streamSSE(c, async (stream) => {
    // Send connection confirmation
    await stream.writeSSE({
      data: JSON.stringify({ type: 'connected', userId: session.user.id }),
    });

    // Subscribe to SSE events for this user
    const unsubscribe = sseManager.subscribe(session.user.id, {
      write: async (data: Uint8Array) => {
        const text = new TextDecoder().decode(data);
        // The data already includes "data: " prefix and newlines from sseManager
        // We need to extract just the JSON part for writeSSE
        const match = text.match(/^data: (.+)\n\n$/);
        if (match?.[1]) {
          await stream.writeSSE({ data: match[1] });
        }
      },
    });

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(async () => {
      try {
        await stream.writeSSE({ data: ':heartbeat' });
      } catch {
        // Stream closed, cleanup will happen on abort
      }
    }, 30000);

    // Cleanup on disconnect
    stream.onAbort(() => {
      clearInterval(heartbeat);
      unsubscribe();
    });

    // Keep the stream open

    while (true) {
      await stream.sleep(60000);
    }
  });
});

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
