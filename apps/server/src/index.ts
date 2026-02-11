import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { verifyDbConnection } from '@repo/db/client';
import { env } from './env';
import {
  authRoute,
  authPath,
  apiRoute,
  apiPath,
  staticRoute,
  staticPath,
} from './routes';
import { auth, db, storageConfig } from './services';
import { generateRootHtml } from './utils';

// =============================================================================
// App Setup
// =============================================================================

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// Global middleware
app.use(logger());
app.use(
  secureHeaders({
    crossOriginResourcePolicy: 'cross-origin',
  }),
);

// Global error handler
app.onError((err, c) => {
  console.error('\t[ERROR]', err.stack || err.message || err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// =============================================================================
// Routes
// =============================================================================

// Health check — shallow (for load balancer liveness probes)
app.get('/healthcheck', (c) => c.text('OK'));

// Deep health check — verifies downstream dependencies (for readiness probes)
app.get('/healthcheck/deep', async (c) => {
  const checks: Record<
    string,
    { status: string; latencyMs?: number; error?: string }
  > = {};

  // Database check
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

  const allHealthy = Object.values(checks).every((ch) => ch.status === 'ok');
  return c.json(
    { status: allHealthy ? 'ok' : 'degraded', checks },
    allHealthy ? 200 : 503,
  );
});

// Root page
app.get('/', (c) =>
  c.html(generateRootHtml(env.PUBLIC_WEB_URL, env.PUBLIC_SERVER_URL)),
);

// Static files (filesystem storage only)
if (storageConfig.provider === 'filesystem') {
  app.route(staticPath, staticRoute);
}

// Auth routes
app.route(authPath, authRoute);

// API routes (must be last - catches all /api/*)
app.route(apiPath, apiRoute);

// =============================================================================
// Exports
// =============================================================================

export { db, serverRuntime, storageConfig } from './services';
export default app;
