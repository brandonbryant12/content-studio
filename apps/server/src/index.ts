import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { env } from './env';
import {
  authRoute,
  authPath,
  apiRoute,
  apiPath,
  eventsRoute,
  eventsPath,
  brandChatRoute,
  brandChatPath,
} from './routes';
import { auth } from './services';
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

// Global error handler
app.onError((err, c) => {
  console.error('\t[ERROR]', err.stack || err.message || err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// =============================================================================
// Routes
// =============================================================================

// Health check
app.get('/healthcheck', (c) => c.text('OK'));

// Root page
app.get('/', (c) =>
  c.html(generateRootHtml(env.PUBLIC_WEB_URL, env.PUBLIC_SERVER_URL)),
);

// Auth routes
app.route(authPath, authRoute);

// SSE events
app.route(eventsPath, eventsRoute);

// Brand chat (AI streaming)
app.route(brandChatPath, brandChatRoute);

// API routes (must be last - catches all /api/*)
app.route(apiPath, apiRoute);

// =============================================================================
// Exports
// =============================================================================

export { db, serverRuntime, sseManager, storageConfig } from './services';
export default app;
