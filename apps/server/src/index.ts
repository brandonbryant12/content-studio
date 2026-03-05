import { pingSSEPublisher } from '@repo/api/server';
import { verifyDbConnection } from '@repo/db/client';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import type { auth } from './services';
import { env } from './env';
import { globalErrorHandler } from './error-handler';
import { requestIdMiddleware } from './middleware/request-id';
import { requestLog } from './middleware/request-log';
import {
  authRoute,
  authPath,
  apiRoute,
  apiPath,
  staticRoute,
  staticPath,
} from './routes';
import { db } from './services';
import { generateRootHtml } from './utils';

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
    requestId: string;
  };
}>();

app.use(requestIdMiddleware);
app.use(timing());
app.use(requestLog());
app.use(
  secureHeaders({
    crossOriginResourcePolicy: 'cross-origin',
  }),
);

app.onError(globalErrorHandler);

app.get('/healthcheck', (c) => c.text('OK'));

app.get('/healthcheck/deep', async (c) => {
  if (!env.EXPOSE_DEEP_HEALTHCHECK) {
    return c.text('Not Found', 404);
  }

  const checks: Record<
    string,
    { status: string; latencyMs?: number; error?: string }
  > = {};

  const dbStart = Date.now();
  try {
    await verifyDbConnection(db);
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.database = {
      status: 'error',
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const redisStart = Date.now();
  try {
    await pingSSEPublisher();
    checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
  } catch (err) {
    checks.redis = {
      status: 'error',
      latencyMs: Date.now() - redisStart,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const allHealthy = Object.values(checks).every((ch) => ch.status === 'ok');
  return c.json(
    { status: allHealthy ? 'ok' : 'degraded', checks },
    allHealthy ? 200 : 503,
  );
});

app.get('/', (c) =>
  c.html(generateRootHtml(env.PUBLIC_WEB_URL, env.PUBLIC_SERVER_URL)),
);

app.route(staticPath, staticRoute);

app.route(authPath, authRoute);

// Must be last — catches all /api/*
app.route(apiPath, apiRoute);

export { db, serverRuntime, storageConfig } from './services';
export default app;
