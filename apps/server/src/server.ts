import { serve } from '@hono/node-server';
import { createDb, verifyDbConnection } from '@repo/db/client';
import { QUEUE_DEFAULTS } from './constants';
import { env } from './env';
import { createPodcastWorker } from './workers/podcast-worker';
import app, { storageConfig } from '.';

// =============================================================================
// Global Error Handlers
// =============================================================================

/**
 * Handle unhandled promise rejections.
 * Logs the error with stack trace but doesn't crash - allows graceful handling.
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Promise Rejection:', {
    reason:
      reason instanceof Error
        ? { message: reason.message, stack: reason.stack }
        : reason,
    promise: String(promise),
  });
});

/**
 * Handle uncaught exceptions.
 * These are fatal - log and exit to prevent undefined state.
 */
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// =============================================================================
// Server Startup
// =============================================================================

const startServer = async () => {
  // Verify database connection before starting
  console.log('Verifying database connection...');
  const db = createDb({ databaseUrl: env.SERVER_POSTGRES_URL });

  try {
    await verifyDbConnection(db);
    console.log('Database connection verified');
  } catch (error) {
    console.error(
      'Failed to start server:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }

  // Start the podcast worker
  const worker = createPodcastWorker({
    databaseUrl: env.SERVER_POSTGRES_URL,
    pollInterval: QUEUE_DEFAULTS.POLL_INTERVAL_MS,
    geminiApiKey: env.GEMINI_API_KEY,
    storageConfig,
  });

  worker.start().catch((error) => {
    console.error('Worker error:', error);
    process.exit(1);
  });

  const server = serve(
    {
      fetch: app.fetch,
      port: env.SERVER_PORT,
      hostname: env.SERVER_HOST,
    },
    (info) => {
      const host = info.family === 'IPv6' ? `[${info.address}]` : info.address;
      console.log(`
Hono
- internal server url: http://${host}:${info.port}
- external server url: ${env.PUBLIC_SERVER_URL}
- public web url: ${env.PUBLIC_WEB_URL}
      `);
    },
  );

  const shutdown = () => {
    server.close((error) => {
      if (error) {
        console.error(error);
      } else {
        console.log('\nServer has stopped gracefully.');
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer();
