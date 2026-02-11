/* eslint-disable no-console -- Server entry point: lifecycle logging before/after Effect runtime */
// Configure proxy FIRST before any network requests
// eslint-disable-next-line import/order -- Must execute before any other imports make network requests
import { configureProxy } from './proxy';
configureProxy();

import { serve } from '@hono/node-server';
import { verifyDbConnection } from '@repo/db/client';
import { QUEUE_DEFAULTS } from './constants';
import { env } from './env';
import { createUnifiedWorker } from './workers/unified-worker';
import app, { db, serverRuntime } from '.';

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Promise Rejection:', {
    reason:
      reason instanceof Error
        ? { message: reason.message, stack: reason.stack }
        : reason,
    promise: String(promise),
  });
});

process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

const startServer = async () => {
  console.log('Verifying database connection...');

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

  const worker = createUnifiedWorker({
    pollInterval: QUEUE_DEFAULTS.POLL_INTERVAL_MS,
    runtime: serverRuntime,
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

  let isShuttingDown = false;
  const SHUTDOWN_TIMEOUT_MS = 30_000;

  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('\nShutting down gracefully...');

    const forceTimer = setTimeout(() => {
      console.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref();

    try {
      await new Promise<void>((resolve) => {
        server.close((error) => {
          if (error) console.error('Error closing HTTP server:', error);
          else console.log('HTTP server closed');
          resolve();
        });
      });

      await worker.stop();
      console.log('Worker stopped');

      await db.$client.end();
      console.log('Database pool closed');

      console.log('Server has stopped gracefully.');
    } catch (error) {
      console.error('Error during shutdown:', error);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer();
