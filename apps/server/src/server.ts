import { serve } from '@hono/node-server';
import { createDb, verifyDbConnection } from '@repo/db/client';
import { QUEUE_DEFAULTS } from './constants';
import { env } from './env';
import { createPodcastWorker } from './workers/podcast-worker';
import { createVoiceoverWorker } from './workers/voiceover-worker';
import { createUnifiedWorker } from './workers/unified-worker';
import app, { storageConfig } from '.';

// =============================================================================
// Mode Configuration
// =============================================================================

type ServerMode = 'server' | 'worker';

/**
 * Parse server mode from CLI args or environment variable.
 * Priority: CLI flag > WORKER_MODE env var > default 'server'
 */
const parseMode = (): ServerMode => {
  // Check CLI args first
  const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
  if (modeArg) {
    const mode = modeArg.split('=')[1];
    if (mode === 'worker' || mode === 'server') {
      return mode;
    }
    console.warn(`Invalid mode "${mode}", using default "server"`);
  }

  // Check environment variable
  if (env.WORKER_MODE) {
    return 'worker';
  }

  return 'server';
};

const mode = parseMode();

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

/**
 * Start the HTTP server with embedded workers (default mode).
 * This is the original behavior for local development.
 */
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
  const podcastWorker = createPodcastWorker({
    databaseUrl: env.SERVER_POSTGRES_URL,
    pollInterval: QUEUE_DEFAULTS.POLL_INTERVAL_MS,
    geminiApiKey: env.GEMINI_API_KEY,
    storageConfig,
    useMockAI: env.USE_MOCK_AI,
  });

  // Start the voiceover worker
  const voiceoverWorker = createVoiceoverWorker({
    databaseUrl: env.SERVER_POSTGRES_URL,
    pollInterval: QUEUE_DEFAULTS.POLL_INTERVAL_MS,
    geminiApiKey: env.GEMINI_API_KEY,
    storageConfig,
    useMockAI: env.USE_MOCK_AI,
  });

  // Start both workers
  Promise.all([podcastWorker.start(), voiceoverWorker.start()]).catch(
    (error) => {
      console.error('Worker error:', error);
      process.exit(1);
    },
  );

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
- mode: server
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

/**
 * Start only the unified worker (worker mode).
 * Used for Kubernetes deployments where workers run as separate pods.
 */
const startWorker = async () => {
  console.log('Starting in worker mode...');

  // Verify database connection before starting
  console.log('Verifying database connection...');
  const db = createDb({ databaseUrl: env.SERVER_POSTGRES_URL });

  try {
    await verifyDbConnection(db);
    console.log('Database connection verified');
  } catch (error) {
    console.error(
      'Failed to start worker:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }

  // Create and start the unified worker
  const unifiedWorker = createUnifiedWorker({
    databaseUrl: env.SERVER_POSTGRES_URL,
    pollInterval: QUEUE_DEFAULTS.POLL_INTERVAL_MS,
    geminiApiKey: env.GEMINI_API_KEY,
    storageConfig,
    useMockAI: env.USE_MOCK_AI,
  });

  // Graceful shutdown handler
  let isShuttingDown = false;
  const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('\nWorker shutting down gracefully...');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start the worker (this will run forever or until max errors)
  try {
    await unifiedWorker.start();
  } catch (error) {
    console.error('Worker failed:', error);
    process.exit(1);
  }
};

// =============================================================================
// Entry Point
// =============================================================================

if (mode === 'worker') {
  startWorker();
} else {
  startServer();
}
